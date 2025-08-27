import React from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

const ItineraryList: React.FC<any> = ({ itinerary, stops, setStops, setRoute }) => {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = stops.findIndex((s: any) => s.taskId === active.id);
      const newIndex = stops.findIndex((s: any) => s.taskId === over.id);
      const newStops = arrayMove(stops, oldIndex, newIndex);
      setStops(newStops);
      // Recalculate route
      if (itinerary && itinerary.routeRequest) {
        const newRouteReq = { ...itinerary.routeRequest, destinations: newStops.map((s: any) => s.place.location) };
        const route = await fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRouteReq)
        }).then(r => r.json());
        setRoute(route);
      }
    }
  };

  return (
    <div className="p-4 bg-white shadow mt-4 flex flex-col gap-2">
      <h2 className="text-lg font-semibold mb-2">Stops</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stops.map((s: any) => s.taskId)} strategy={verticalListSortingStrategy}>
          {stops.map((stop: any, i: number) => (
            <div key={stop.taskId} id={stop.taskId} className="border rounded p-2 mb-2 bg-gray-50 flex flex-col">
              <span className="font-bold text-blue-700">{stop.place.name || 'Unknown Place'}</span>
              <span className="text-xs text-gray-500">Rating: {stop.place.rating ?? 'N/A'}</span>
              <span className="text-xs text-gray-500">Tags: {stop.place.tags?.join(', ') ?? 'N/A'}</span>
              <span className="text-xs text-gray-500">Distance: {stop.place.distance ?? 'N/A'}</span>
            </div>
          ))}
        </SortableContext>
      </DndContext>
      {itinerary && (
        <button
          className="bg-yellow-500 text-white px-2 py-1 rounded mt-2"
          onClick={() => {
            const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
            favs.push(itinerary);
            localStorage.setItem('favorites', JSON.stringify(favs));
          }}
        >Save as favorite</button>
      )}
    </div>
  );
};

export default ItineraryList;
