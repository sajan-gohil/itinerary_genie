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
  <div className="p-3 md:p-4 bg-panel rounded-panel shadow-subtle mt-3 flex flex-col gap-3 text-text-deep border border-muted/40">
      <h2 className="text-h2 font-lora mb-2">Stops</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stops.map((s: any) => s.taskId)} strategy={verticalListSortingStrategy}>
          {stops.map((stop: any, i: number) => (
            <div key={stop.taskId} id={stop.taskId} className="border border-muted/40 rounded-md p-3 bg-cream flex flex-col gap-1">
              <span className="font-lora text-body leading-tight">{stop.place.name || 'Unknown Place'}</span>
              <span className="text-small leading-snug text-muted">Rating: {stop.place.rating ?? 'N/A'}</span>
              <span className="text-small leading-snug text-muted">Tags: {stop.place.tags?.join(', ') ?? 'N/A'}</span>
              <span className="text-small leading-snug text-muted">Distance: {stop.place.distance ?? 'N/A'}</span>
            </div>
          ))}
        </SortableContext>
      </DndContext>
      {itinerary && (
        <button
          className="px-3 py-2 rounded-full mt-2 bg-rust text-white shadow-subtle hover:opacity-95 transition-smooth"
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
