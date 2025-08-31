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
  const [loadingStep, setLoadingStep] = useState<string | null>(null); // Track the current loading step

  return (
  <div className="flex flex-row h-screen w-screen bg-panel bg-paper overflow-hidden">
      <div className="w-1/3 flex flex-col h-full max-h-screen overflow-hidden z-10 shadow-subtle bg-panel/80 backdrop-blur-sm left-panel">
        {/* <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%', gap: '18px' }}> */}
          <InputPanel
            setItinerary={setItinerary}
            setRoute={setRoute}
            setLoading={setLoading}
            setLoadingStep={setLoadingStep} // New prop
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
      {/* </div> */}
      <div className="w-2/3 flex-1 relative bg-cream overflow-hidden h-full">
        <MapView
          itinerary={itinerary}
          route={route}
          stops={stops}
        />
      </div>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-box">
            <span className="loading-text">{loadingStep || 'Loading...'}</span>
          </div>
        </div>
      )}
      {error && <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow z-50">{error}</div>}
    </div>
  );
};

export default App;
