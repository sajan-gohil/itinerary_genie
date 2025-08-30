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

  const hasStops = stops;// && stops.length > 0;
  return (
    <div className={`stops-list-section p-3 md:p-3 bg-panel rounded-panel shadow-subtle mt-3 flex flex-col text-text-deep${hasStops ? ' border border-muted/40' : ''}`} style={{ paddingBottom: '32px' }}>
      <h3 className="text-h3 font-lora mb-1" style={{ paddingBottom: '2px', marginBottom: hasStops ? '8px' : '0' }}>Stops</h3>
      {hasStops && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stops.map((s: any) => s.taskId)} strategy={verticalListSortingStrategy}>
            <div className="itinerary-stops-list">
              {stops.map((stop: any, i: number) => (
                <div key={stop.taskId} id={stop.taskId} className="itinerary-stop-card border border-muted/40 rounded-md p-3 bg-panel flex flex-col gap-1">
                  <span className="font-lora text-body leading-tight">{stop.place.name || 'Unknown Place'}</span>
                  <span className="text-small leading-snug text-muted">
                    Rating: {typeof stop.place.rating === 'number' ? stop.place.rating.toFixed(2) : 'N/A'}
                    {' | '}
                    Tags: {stop.place.tags?.join(', ') ?? 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default ItineraryList;
