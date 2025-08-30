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
        async (pos) => {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          // Reverse geocode to get address string
          try {
            const result = await geocodeAddress(`${pos.coords.latitude},${pos.coords.longitude}`);
            // Try to use a general area or place name if available
            if (result) {
              if (result.name) {
                setLocation(result.name);
              } else if (result.city) {
                setLocation(result.city);
              } else if (result.address) {
                setLocation(result.address);
              } else {
                setLocation('Your area');
              }
            } else {
              setLocation('Your area');
            }
          } catch {
            setLocation('Your area');
          }
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
  <div className="input-panel">
      <div>
        <label className="todo-label">To-Do List</label>
        <textarea
          className="todo-textarea"
          rows={3}
          placeholder={examples[0] || 'Enter your to-do list, e.g., museum, coffee, dinner'}
          value={todo}
          onChange={e => setTodo(e.target.value)}
        />
        <div className="example-buttons">
          {examples.map((ex, i) => (
            <button
              key={i}
              className="example-btn"
              onClick={() => handleExample(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="location-label">Starting Location</label>
        <div className="location-row">
          <input
            className="location-input"
            placeholder="Enter address or city"
            value={location}
            onChange={e => handleLocationInput(e.target.value)}
            disabled={useMyLocation}
          />
          <button className="location-btn" onClick={handleUseLocation}>Use my location</button>
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <label className="mode-label">Mode:</label>
        <div className="mode-buttons">
          <button
            className={`mode-btn${mode === 'order' ? ' selected' : ''}`}
            onClick={() => setMode('order')}
          >
            In Order
          </button>
          <button
            className={`mode-btn${mode === 'optimize' ? ' selected' : ''}`}
            onClick={() => setMode('optimize')}
          >
            Optimize
          </button>
        </div>
      </div>
      {/* <div className="flex gap-4 items-center">
        <label className="transport-label">Transport:</label>
        <div className="transport-buttons">
          <button
            className={`transport-btn${transport === 'walking' ? ' selected' : ''}`}
            onClick={() => setTransport('walking')}
          >
            Walking
          </button>
          <button
            className={`transport-btn${transport === 'driving' ? ' selected' : ''}`}
            onClick={() => setTransport('driving')}
          >
            Driving
          </button>
        </div>
      </div> */}
      <div>
        <label className="maxstops-label">Max Stops: {maxStops}</label>
        <input
          type="range"
          min={2}
          max={12}
          value={maxStops}
          onChange={e => setMaxStops(Number(e.target.value))}
          className="maxstops-range"
        />
      </div>
      <button
        className="generate-btn"
        onClick={handleGenerate}
      >Generate</button>
    </div>
  );
};

export default InputPanel;
