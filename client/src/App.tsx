
import React, { useState } from 'react';
import InputPanel from './components/InputPanel';
import MapView from './components/MapView';
import ItineraryList from './components/ItineraryList';

const App: React.FC = () => {
  const [itinerary, setItinerary] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stops, setStops] = useState<any[]>([]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-gray-50">
      <div className="md:w-1/3 w-full md:h-full h-auto z-10">
        <InputPanel
          setItinerary={setItinerary}
          setRoute={setRoute}
          setLoading={setLoading}
          setError={setError}
          setStops={setStops}
        />
        <ItineraryList
          itinerary={itinerary}
          stops={stops}
          setStops={setStops}
          setRoute={setRoute}
        />
      </div>
      <div className="md:w-2/3 w-full h-full relative">
        <MapView
          itinerary={itinerary}
          route={route}
          stops={stops}
        />
      </div>
      {loading && <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"><span className="text-white text-xl">Loading...</span></div>}
      {error && <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow z-50">{error}</div>}
    </div>
  );
};

export default App;
