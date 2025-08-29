import React, { useEffect, useState } from 'react';
import { parseTasks, generateItinerary, getRoute, geocodeAddress, getExamples } from '../services/api';

const InputPanel: React.FC<any> = ({ setItinerary, setRoute, setLoading, setError, setStops }) => {
  const [todo, setTodo] = useState('');
  const [location, setLocation] = useState('');
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mode, setMode] = useState<'order' | 'optimize'>('order');
  const [transport, setTransport] = useState<'walking' | 'driving'>('walking');
  const [maxStops, setMaxStops] = useState(6);
  const [debounceTimer, setDebounceTimer] = useState<any>(null);
  const [examples, setExamples] = useState<string[]>([]);

  useEffect(() => {
    // Load examples from server
    getExamples()
      .then(setExamples)
      .catch(() => setExamples([]));
  }, []);

  // Geolocation
  const handleUseLocation = () => {
    setUseMyLocation(true);
    setLocation('');
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLoading(false);
        },
        (err) => {
          setError('Could not get location');
          setLoading(false);
        }
      );
    }
  };

  // Address geocoding (dynamic via server)
  const handleLocationInput = (val: string) => {
    setLocation(val);
    setUseMyLocation(false);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(setTimeout(() => {
      if (val.length > 3) {
        setLoading(true);
        geocodeAddress(val)
          .then((data) => {
            setCoords({ lat: data.lat, lon: data.lon });
          })
          .catch(() => {
            setCoords(null);
          })
          .finally(() => setLoading(false));
      }
    }, 400));
  };

  const handleExample = (ex: string) => setTodo(ex);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const origin = coords;
      console.log("Origin = ", origin);
      if (!todo || !origin) {
        setError('Enter to-do list and location');
        setLoading(false);
        return;
      }
  const parsed = await parseTasks(todo, coords ? { lat: coords.lat, lon: coords.lon } : undefined);
      const tasks = parsed.tasks.slice(0, maxStops);
      console.log("Parsed tasks = ", tasks);
      const itinerary = await generateItinerary({ tasks, origin, mode, transportMode: transport });
      console.log("Generated itinerary = ", itinerary);
      setItinerary(itinerary);
      setStops(itinerary.orderedStops);
      const route = await getRoute(itinerary.routeRequest);
      setRoute(route);
    } catch (e: any) {
      setError(e.message || 'Error generating itinerary');
    }
    setLoading(false);
  };

  return (
  <div className="p-3 md:p-4 bg-panel rounded-panel shadow-subtle h-auto md:max-h-screen md:overflow-y-auto flex flex-col gap-3 text-text-deep border border-muted/40">
      <div>
        <label className="block text-small font-medium mb-1 font-lora text-text-deep">To-Do List</label>
        <textarea
          className="w-full border border-muted/40 rounded-md p-2 text-body bg-cream placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
          rows={3}
          placeholder={examples[0] || 'Enter your to-do list, e.g., museum, coffee, dinner'}
          value={todo}
          onChange={e => setTodo(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          {examples.map((ex, i) => (
            <button key={i} className="text-small bg-cream border border-muted/40 px-2 py-1 rounded-full text-text-deep/80 hover:bg-white transition-smooth" onClick={() => handleExample(ex)}>{ex}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-small font-medium mb-1 font-lora">Location</label>
        <div className="flex gap-2">
          <input
            className="border border-muted/40 rounded-md p-2 text-body flex-1 bg-white placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
            placeholder="Enter address or city"
            value={location}
            onChange={e => handleLocationInput(e.target.value)}
            disabled={useMyLocation}
          />
          <button className="bg-sage text-text-deep px-3 py-2 rounded-full text-small shadow-subtle hover:opacity-90 transition-smooth" onClick={handleUseLocation}>Use my location</button>
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <label className="text-small">Mode:</label>
        <button
          className={`px-3 py-1.5 rounded-full text-small transition-smooth ${mode === 'order' ? 'bg-teal text-white' : 'bg-cream border border-muted/40 text-text-deep'}`}
          onClick={() => setMode('order')}
        >Order-Respect</button>
        <button
          className={`px-3 py-1.5 rounded-full text-small transition-smooth ${mode === 'optimize' ? 'bg-teal text-white' : 'bg-cream border border-muted/40 text-text-deep'}`}
          onClick={() => setMode('optimize')}
        >Optimize</button>
      </div>
      <div className="flex gap-4 items-center">
        <label className="text-small">Transport:</label>
        <button
          className={`px-3 py-1.5 rounded-full text-small transition-smooth ${transport === 'walking' ? 'bg-teal text-white' : 'bg-cream border border-muted/40 text-text-deep'}`}
          onClick={() => setTransport('walking')}
        >Walking</button>
        <button
          className={`px-3 py-1.5 rounded-full text-small transition-smooth ${transport === 'driving' ? 'bg-teal text-white' : 'bg-cream border border-muted/40 text-text-deep'}`}
          onClick={() => setTransport('driving')}
        >Driving</button>
      </div>
      <div>
        <label className="block text-small font-medium mb-1">Max Stops: {maxStops}</label>
        <input
          type="range"
          min={2}
          max={12}
          value={maxStops}
          onChange={e => setMaxStops(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <button
        className="bg-rust text-white px-5 py-2.5 rounded-full mt-2 shadow-subtle hover:opacity-95 transition-smooth"
        onClick={handleGenerate}
      >Generate</button>
    </div>
  );
};

export default InputPanel;
