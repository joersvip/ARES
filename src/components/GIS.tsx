import React, { useState, useEffect, useRef } from 'react';
import { Topbar } from '../App';
import { getGISMarkers, addGISMarker, deleteGISMarker, getGISTracks, addGISTrack, getGISGeofences, addGISGeofence, deleteGISGeofence } from '../lib/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Route, Hexagon, History, Trash2, Plus, AlertTriangle, Target } from 'lucide-react';

// Fix Leaflet's default icon path issues with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents({ onMapClick }: { onMapClick: (e: any) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e);
    }
  });
  return null;
}

export default function GIS({ currentUser }: { currentUser: any }) {
  const [activeTab, setActiveTab] = useState<'map' | 'history'>('map');
  const [actionType, setActionType] = useState<'view' | 'marker' | 'geofence_circle'>('view');
  
  const [markers, setMarkers] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  
  // GPS Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [currentTrack, setCurrentTrack] = useState<[number, number][]>([]);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetchGISData();
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const fetchGISData = async () => {
    const [m, t, g] = await Promise.all([getGISMarkers(), getGISTracks(), getGISGeofences()]);
    setMarkers(m);
    setTracks(t.map((tr: any) => ({ ...tr, pathData: JSON.parse(tr.pathData) })));
    setGeofences(g.map((ge: any) => ({ ...ge, geomData: JSON.parse(ge.geomData) })));
  };

  const handleMapClick = async (e: any) => {
    const { lat, lng } = e.latlng;
    if (actionType === 'marker') {
      const title = prompt('Enter marker title:');
      if (title) {
        await addGISMarker({ title, description: 'User added marker', lat, lng });
        fetchGISData();
      }
      setActionType('view');
    } else if (actionType === 'geofence_circle') {
      const name = prompt('Enter geofence name:');
      const radiusStr = prompt('Enter radius in meters:', '500');
      if (name && radiusStr) {
        const radius = parseFloat(radiusStr);
        await addGISGeofence({ name, fenceType: 'circle', geomData: { center: [lat, lng], radius } });
        fetchGISData();
      }
      setActionType('view');
    }
  };

  const toggleTracking = () => {
    if (isTracking) {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      
      // Save track if > 1 points
      if (currentTrack.length > 1) {
        const name = prompt('Save this track as:', `Track ${new Date().toLocaleTimeString()}`);
        if (name) {
          addGISTrack({ name, pathData: currentTrack }).then(fetchGISData);
        }
      }
      setCurrentTrack([]);
    } else {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }
      setIsTracking(true);
      setCurrentTrack([]);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCurrentPosition(newPos);
          setCurrentTrack(prev => [...prev, newPos]);
        },
        (err) => {
          console.error(err);
          alert('GPS Error: ' + err.message);
          setIsTracking(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleDeleteMarker = async (id: string) => {
    await deleteGISMarker(id);
    fetchGISData();
  };

  const handleDeleteGeofence = async (id: string) => {
    await deleteGISGeofence(id);
    fetchGISData();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      <Topbar title="Geospatial Intelligence (GIS)" />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-800 bg-slate-900 p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('map')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'map' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <MapPin className="w-5 h-5" /> Live Map
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <History className="w-5 h-5" /> GIS Records
          </button>
          
          <div className="mt-8 border-t border-slate-800 pt-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Map Tools</h3>
            <button 
              onClick={() => setActionType(actionType === 'marker' ? 'view' : 'marker')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mb-2 ${actionType === 'marker' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <Target className="w-5 h-5" /> Drop Marker
            </button>
            <button 
              onClick={() => setActionType(actionType === 'geofence_circle' ? 'view' : 'geofence_circle')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mb-4 ${actionType === 'geofence_circle' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <Hexagon className="w-5 h-5" /> Add Geofence
            </button>
            
            <button 
              onClick={toggleTracking} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isTracking ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            >
              <Navigation className="w-5 h-5" /> {isTracking ? 'Stop GPS Tracking' : 'Start GPS Tracking'}
            </button>
            
            <div className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Offline Mode
              </div>
              <p className="text-xs text-slate-500">Maps are automatically cached via PWA Service Worker for offline field operations.</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {activeTab === 'map' && (
            <div className="absolute inset-0 z-0 bg-slate-900">
              <MapContainer 
                center={[37.7749, -122.4194]} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapEvents onMapClick={handleMapClick} />
                
                {/* Geofences */}
                {geofences.map(gf => (
                  <Circle 
                    key={gf.id} 
                    center={gf.geomData.center} 
                    radius={gf.geomData.radius} 
                    pathOptions={{ color: 'purple', fillColor: 'purple', fillOpacity: 0.2 }}
                  >
                    <Popup>{gf.name} (Geofence)</Popup>
                  </Circle>
                ))}

                {/* Markers */}
                {markers.map(m => (
                  <Marker key={m.id} position={[m.lat, m.lng]}>
                    <Popup>
                      <strong>{m.title}</strong><br/>
                      {m.description}
                    </Popup>
                  </Marker>
                ))}
                
                {/* Historical Tracks */}
                {tracks.map(t => (
                  <Polyline key={t.id} positions={t.pathData} pathOptions={{ color: 'indigo', weight: 4 }}>
                    <Popup>{t.name}</Popup>
                  </Polyline>
                ))}

                {/* Active Tracking */}
                {currentTrack.length > 0 && (
                  <Polyline positions={currentTrack} pathOptions={{ color: 'emerald', weight: 5, dashArray: '10, 10' }} />
                )}
                {currentPosition && (
                  <Marker position={currentPosition}>
                    <Popup>Current Location</Popup>
                  </Marker>
                )}
              </MapContainer>
              
              {/* Overlay HUD */}
              {actionType !== 'view' && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-700 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-white font-medium">Click anywhere on the map to place {actionType === 'marker' ? 'Marker' : 'Geofence'}</span>
                  <button onClick={() => setActionType('view')} className="ml-4 text-slate-400 hover:text-white text-sm">Cancel</button>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="absolute inset-0 z-10 bg-slate-950 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-8">
                
                <section>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-white">
                    <Route className="w-6 h-6 text-indigo-500" /> Recorded GPS Tracks
                  </h2>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    {tracks.length === 0 ? <p className="p-6 text-slate-500">No tracks recorded.</p> : (
                      <table className="w-full text-left">
                        <thead className="bg-slate-950 text-slate-400 text-sm">
                          <tr><th className="px-6 py-4">Track Name</th><th className="px-6 py-4">Data Points</th><th className="px-6 py-4">Recorded At</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {tracks.map(t => (
                            <tr key={t.id} className="hover:bg-slate-800/50">
                              <td className="px-6 py-4 font-medium text-slate-200">{t.name}</td>
                              <td className="px-6 py-4 text-slate-400">{t.pathData.length} points</td>
                              <td className="px-6 py-4 text-slate-400">{new Date(t.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <section>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-white">
                      <Target className="w-6 h-6 text-blue-500" /> Active Markers
                    </h2>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      {markers.length === 0 ? <p className="text-slate-500 p-2">No markers dropped.</p> : markers.map(m => (
                        <div key={m.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-200">{m.title}</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">{m.lat.toFixed(4)}, {m.lng.toFixed(4)}</p>
                          </div>
                          <button onClick={() => handleDeleteMarker(m.id)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}
                    </div>
                  </section>
                  
                  <section>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-white">
                      <Hexagon className="w-6 h-6 text-purple-500" /> Geofence Zones
                    </h2>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      {geofences.length === 0 ? <p className="text-slate-500 p-2">No geofences established.</p> : geofences.map(gf => (
                        <div key={gf.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-200">{gf.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">Radius: {gf.geomData.radius}m</p>
                          </div>
                          <button onClick={() => handleDeleteGeofence(gf.id)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
