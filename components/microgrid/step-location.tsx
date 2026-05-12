"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ZNI_LOCATIONS } from "@/lib/microgrid/defaults"
import { IEEE_33_NODE, IEEE_69_NODE } from "@/lib/microgrid/ieee-test-cases"
import { FlaskConical, MapPin, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import type { SiteConfig } from "@/lib/microgrid/types"

interface StepLocationProps {
  site: SiteConfig | null
  onSiteSelect: (site: SiteConfig) => void
  onNext: () => void
  onStartIEEETest: (system: "33" | "69") => void
}

export function StepLocation({ site, onSiteSelect, onNext, onStartIEEETest }: StepLocationProps) {
  const [activeTab, setActiveTab] = useState<"map" | "ieee">("map")
  const [lat, setLat] = useState(site?.lat?.toString() ?? "4.7110")
  const [lon, setLon] = useState(site?.lon?.toString() ?? "-74.0721")
  const [name, setName] = useState(site?.name ?? "")
  const [selectedIEEE, setSelectedIEEE] = useState<"33" | "69">("33")
  const [showLines, setShowLines] = useState(false)
  const [showLoads, setShowLoads] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const markerRef = useRef<unknown>(null)

  const ieeeData = selectedIEEE === "33" ? IEEE_33_NODE : IEEE_69_NODE

  const updateMarker = useCallback((latitude: number, longitude: number) => {
    const map = mapInstanceRef.current as { setView: (c: [number, number], z: number) => void; getZoom: () => number } | null
    const marker = markerRef.current as { setLatLng: (c: [number, number]) => void } | null
    if (map && marker) {
      marker.setLatLng([latitude, longitude])
      map.setView([latitude, longitude], map.getZoom())
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    let cancelled = false

    const loadMap = async () => {
      const L = (await import("leaflet")).default

      if (cancelled || !mapRef.current) return

      const map = L.map(mapRef.current, {
        center: [parseFloat(lat) || 4.711, parseFloat(lon) || -74.072],
        zoom: 6,
        zoomControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 18,
      }).addTo(map)

      L.rectangle(
        [
          [-4.5, -82],
          [13.5, -66.5],
        ],
        { color: "hsl(38, 92%, 50%)", weight: 1, fill: false, dashArray: "5,5" }
      ).addTo(map)

      const defaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })

      const marker = L.marker([parseFloat(lat) || 4.711, parseFloat(lon) || -74.072], {
        icon: defaultIcon,
        draggable: true,
      }).addTo(map)

      marker.on("dragend", () => {
        const pos = marker.getLatLng()
        setLat(pos.lat.toFixed(4))
        setLon(pos.lng.toFixed(4))
      })

      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng)
        setLat(e.latlng.lat.toFixed(4))
        setLon(e.latlng.lng.toFixed(4))
      })

      mapInstanceRef.current = map
      markerRef.current = marker

      for (const loc of ZNI_LOCATIONS) {
        L.circleMarker([loc.lat, loc.lon], {
          radius: 5,
          color: "hsl(174, 60%, 41%)",
          fillColor: "hsl(174, 60%, 41%)",
          fillOpacity: 0.6,
          weight: 1,
        })
          .bindTooltip(loc.name, { permanent: false })
          .addTo(map)
      }
    }

    loadMap()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove()
        mapInstanceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePresetSelect = (value: string) => {
    const loc = ZNI_LOCATIONS.find((l) => l.name === value)
    if (loc) {
      setLat(loc.lat.toString())
      setLon(loc.lon.toString())
      setName(loc.name)
      updateMarker(loc.lat, loc.lon)
    }
  }

  const handleConfirm = () => {
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)
    if (isNaN(latitude) || isNaN(longitude)) return

    onSiteSelect({
      lat: latitude,
      lon: longitude,
      name: name || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
      timezone: "America/Bogota",
    })
    onNext()
  }

  const handleIEEETest = () => {
    // Ir directamente a optimizacion con datos IEEE precargados
    onStartIEEETest(selectedIEEE)
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "map" | "ieee")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Ubicacion Real
          </TabsTrigger>
          <TabsTrigger value="ieee" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Pruebas IEEE
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mapa de Colombia - ZNI</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div ref={mapRef} className="h-[480px] w-full rounded-b-lg" />
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ubicacion del Sitio</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Ubicaciones ZNI predefinidas</Label>
                    <Select onValueChange={handlePresetSelect}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar ubicacion..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ZNI_LOCATIONS.map((loc) => (
                          <SelectItem key={loc.name} value={loc.name}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="lat" className="text-xs text-muted-foreground">
                        Latitud
                      </Label>
                      <Input
                        id="lat"
                        type="number"
                        step="0.0001"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        className="mt-1 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lon" className="text-xs text-muted-foreground">
                        Longitud
                      </Label>
                      <Input
                        id="lon"
                        type="number"
                        step="0.0001"
                        value={lon}
                        onChange={(e) => setLon(e.target.value)}
                        className="mt-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="site-name" className="text-xs text-muted-foreground">
                      Nombre del sitio (opcional)
                    </Label>
                    <Input
                      id="site-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Mi comunidad"
                      className="mt-1 text-sm"
                    />
                  </div>

                  <Button onClick={handleConfirm} className="w-full">
                    Confirmar Ubicacion
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Haga clic en el mapa o arrastre el marcador para seleccionar la ubicacion.
                    Los circulos verdes indican zonas ZNI conocidas en Colombia.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ieee" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {/* IEEE System Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FlaskConical className="h-5 w-5 text-primary" />
                      Sistemas de Prueba IEEE
                    </CardTitle>
                    <a 
                      href="https://site.ieee.org/pes-testfeeders/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      IEEE PES Test Feeders
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={selectedIEEE === "33" ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col gap-1"
                      onClick={() => setSelectedIEEE("33")}
                    >
                      <span className="text-lg font-bold">IEEE 33 Nodos</span>
                      <span className="text-xs opacity-80">32 lineas, sistema radial</span>
                    </Button>
                    <Button
                      variant={selectedIEEE === "69" ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col gap-1"
                      onClick={() => setSelectedIEEE("69")}
                    >
                      <span className="text-lg font-bold">IEEE 69 Nodos</span>
                      <span className="text-xs opacity-80">68 lineas, sistema radial</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Parameters */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Parametros del Sistema IEEE {selectedIEEE}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Nodos</p>
                      <p className="text-xl font-bold">{ieeeData.nNodes}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Lineas</p>
                      <p className="text-xl font-bold">{ieeeData.lines.length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Vbase</p>
                      <p className="text-xl font-bold">{ieeeData.Vbase_kV} kV</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Sbase</p>
                      <p className="text-xl font-bold">{ieeeData.Sbase_kVA / 1000} MVA</p>
                    </div>
                  </div>

                  {/* Lines Table */}
                  <div className="mt-4">
                    <Button 
                      variant="ghost" 
                      className="w-full flex items-center justify-between py-2 text-sm"
                      onClick={() => setShowLines(!showLines)}
                    >
                      <span>Datos de Lineas ({ieeeData.lines.length})</span>
                      {showLines ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {showLines && (
                      <div className="max-h-48 overflow-y-auto border rounded-lg mt-2">
                        <table className="w-full text-xs">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="p-2 text-left">De</th>
                              <th className="p-2 text-left">A</th>
                              <th className="p-2 text-right">R (ohm)</th>
                              <th className="p-2 text-right">X (ohm)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ieeeData.lines.map((line, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2">{line[0]}</td>
                                <td className="p-2">{line[1]}</td>
                                <td className="p-2 text-right font-mono">{line[2].toFixed(4)}</td>
                                <td className="p-2 text-right font-mono">{line[3].toFixed(4)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Loads Table */}
                  <div className="mt-2">
                    <Button 
                      variant="ghost" 
                      className="w-full flex items-center justify-between py-2 text-sm"
                      onClick={() => setShowLoads(!showLoads)}
                    >
                      <span>Datos de Cargas ({ieeeData.loads.length})</span>
                      {showLoads ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {showLoads && (
                      <div className="max-h-48 overflow-y-auto border rounded-lg mt-2">
                        <table className="w-full text-xs">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Nodo</th>
                              <th className="p-2 text-right">P (kW)</th>
                              <th className="p-2 text-right">Q (kVAr)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ieeeData.loads.map((load, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2">{load[0]}</td>
                                <td className="p-2 text-right font-mono">{load[1]}</td>
                                <td className="p-2 text-right font-mono">{load[2]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel */}
            <div className="flex flex-col gap-4">
              <Card className="border-primary/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Validacion con MATLAB</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Estos sistemas de prueba IEEE son identicos a los implementados en el 
                    algoritmo ICSA de MATLAB. Use esta opcion para validar que los resultados 
                    de la aplicacion web coincidan con MATLAB.
                  </p>

                  <div className="rounded-lg bg-primary/10 p-3 border border-primary/30">
                    <p className="text-xs font-medium text-primary mb-2">Datos del Algoritmo MATLAB</p>
                    <div className="space-y-1 text-[10px] font-mono">
                      <p>Sbase = 100 MVA</p>
                      <p>Vbase = 12.66 kV</p>
                      <p>tol_pf = 1e-10</p>
                      <p>maxIter_pf = 400</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Badge variant="outline" className="w-full justify-center py-1">
                      Sistema seleccionado: IEEE {selectedIEEE}
                    </Badge>
                    <Button onClick={handleIEEETest} className="w-full">
                      Iniciar Prueba IEEE {selectedIEEE}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Proposito:</strong> Validar el algoritmo ICSA comparando los 
                    resultados de optimizacion (ubicacion y tamano de GD solar) con los 
                    obtenidos en MATLAB para los mismos sistemas IEEE.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
