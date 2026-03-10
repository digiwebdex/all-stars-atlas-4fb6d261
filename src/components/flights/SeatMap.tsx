import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, X } from "lucide-react";

/* ─── Seat Types ─── */
type SeatStatus = "available" | "occupied" | "selected" | "blocked" | "exit";
type SeatType = "standard" | "window" | "middle" | "aisle" | "extra-legroom" | "premium" | "exit-row" | "front-row";

interface Seat {
  id: string;
  row: number;
  col: string;
  type: SeatType;
  status: SeatStatus;
  price: number;
  label: string;
}

interface SeatMapProps {
  flightNumber: string;
  aircraft?: string;
  cabinClass?: string;
  passengers: { firstName: string; lastName: string; title: string }[];
  selectedSeats: Record<number, string>; // passengerIndex → seatId
  onSeatSelect: (passengerIndex: number, seatId: string, price: number) => void;
  onSeatDeselect: (passengerIndex: number) => void;
  isDomestic?: boolean;
}

/* ─── Generate realistic seat layout based on aircraft type ─── */
function generateSeatLayout(aircraft?: string, cabinClass?: string): Seat[] {
  const seats: Seat[] = [];
  // Determine config based on aircraft
  const isNarrowBody = !aircraft || /ATR|737|A320|A321|A319|320|321|Q400|Dash/i.test(aircraft || "");
  const isWidebody = /777|787|A330|A340|A350|A380|767|747/i.test(aircraft || "");

  const cols = isWidebody ? ["A", "B", "C", "D", "E", "F", "G", "H", "J"] : isNarrowBody && /ATR|Q400|Dash/i.test(aircraft || "") ? ["A", "B", "C", "D"] : ["A", "B", "C", "D", "E", "F"];
  const totalRows = isWidebody ? 35 : /ATR|Q400|Dash/i.test(aircraft || "") ? 18 : 30;
  const exitRows = isWidebody ? [12, 13, 25] : /ATR|Q400|Dash/i.test(aircraft || "") ? [8] : [12, 13];

  for (let row = 1; row <= totalRows; row++) {
    for (const col of cols) {
      const isExit = exitRows.includes(row);
      const isFront = row <= 3;
      const isWindow = col === cols[0] || col === cols[cols.length - 1];
      const isMiddle = cols.length === 6 ? (col === "B" || col === "E") : cols.length >= 9 ? (col === "B" || col === "E" || col === "H") : false;

      // ~30% occupied randomly (seeded by position for consistency)
      const hash = (row * 7 + col.charCodeAt(0) * 13) % 100;
      const isOccupied = hash < 30;

      let type: SeatType = "standard";
      let price = 0;

      if (isExit) { type = "exit-row"; price = 500; }
      else if (isFront) { type = "front-row"; price = 600; }
      else if (row <= 5) { type = "extra-legroom"; price = 800; }
      else if (isWindow) { type = "window"; price = 300; }
      else if (!isMiddle) { type = "aisle"; price = 300; }
      else { type = "standard"; price = 0; }

      seats.push({
        id: `${row}${col}`,
        row,
        col,
        type,
        status: isOccupied ? "occupied" : "available",
        price,
        label: `${row}${col}`,
      });
    }
  }
  return seats;
}

/* ─── Color map ─── */
const seatColors: Record<string, string> = {
  available: "bg-accent/10 border-accent/30 hover:bg-accent/20 cursor-pointer",
  occupied: "bg-muted/60 border-muted-foreground/20 cursor-not-allowed opacity-50",
  selected: "bg-accent border-accent text-accent-foreground cursor-pointer ring-2 ring-accent/40",
  blocked: "bg-muted border-muted cursor-not-allowed opacity-30",
};

const typeLabels: Record<SeatType, { label: string; color: string }> = {
  standard: { label: "Standard", color: "bg-card border-border" },
  window: { label: "Window", color: "bg-sky-500/10 border-sky-500/30" },
  middle: { label: "Middle", color: "bg-card border-border" },
  aisle: { label: "Aisle", color: "bg-violet-500/10 border-violet-500/30" },
  "extra-legroom": { label: "Extra Legroom", color: "bg-amber-500/10 border-amber-500/30" },
  premium: { label: "Premium", color: "bg-yellow-500/10 border-yellow-500/30" },
  "exit-row": { label: "Exit Row", color: "bg-red-500/10 border-red-500/30" },
  "front-row": { label: "Front Row", color: "bg-emerald-500/10 border-emerald-500/30" },
};

const SeatMap = ({
  flightNumber, aircraft, cabinClass, passengers,
  selectedSeats, onSeatSelect, onSeatDeselect,
}: SeatMapProps) => {
  const [activePassenger, setActivePassenger] = useState(0);
  const seats = useMemo(() => generateSeatLayout(aircraft, cabinClass), [aircraft, cabinClass]);

  // Group seats by row
  const rows = useMemo(() => {
    const map = new Map<number, Seat[]>();
    for (const seat of seats) {
      if (!map.has(seat.row)) map.set(seat.row, []);
      map.get(seat.row)!.push(seat);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [seats]);

  const cols = rows[0]?.[1]?.length || 6;
  const isNarrow = cols <= 4;
  const exitRows = new Set(seats.filter(s => s.type === "exit-row").map(s => s.row));

  // Which seats are selected
  const selectedSeatIds = new Set(Object.values(selectedSeats));

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === "occupied" || seat.status === "blocked") return;

    const alreadySelectedByCurrentPax = selectedSeats[activePassenger] === seat.id;
    if (alreadySelectedByCurrentPax) {
      onSeatDeselect(activePassenger);
      return;
    }

    // If another passenger has this seat, ignore
    if (selectedSeatIds.has(seat.id)) return;

    onSeatSelect(activePassenger, seat.id, seat.price);

    // Auto-advance to next unassigned passenger
    const nextUnassigned = passengers.findIndex((_, i) => i > activePassenger && !selectedSeats[i]);
    if (nextUnassigned >= 0) setActivePassenger(nextUnassigned);
  };

  const getSeatDisplayStatus = (seat: Seat): SeatStatus => {
    if (selectedSeatIds.has(seat.id)) return "selected";
    return seat.status;
  };

  const totalSeatCost = Object.entries(selectedSeats).reduce((sum, [, seatId]) => {
    const seat = seats.find(s => s.id === seatId);
    return sum + (seat?.price || 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Passenger selector */}
      <div className="flex flex-wrap gap-2">
        {passengers.map((pax, i) => (
          <button key={i} onClick={() => setActivePassenger(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              activePassenger === i
                ? "border-accent bg-accent/10 text-accent"
                : selectedSeats[i] ? "border-accent/40 bg-accent/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
            }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activePassenger === i ? "bg-accent text-accent-foreground" : selectedSeats[i] ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
            }`}>{i + 1}</span>
            <span>{pax.title} {pax.firstName || `Pax ${i + 1}`}</span>
            {selectedSeats[i] && <Badge className="bg-accent/10 text-accent border-0 text-[9px] h-4">{selectedSeats[i]}</Badge>}
          </button>
        ))}
      </div>

      {/* Aircraft info header */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="text-xs">
            <span className="text-muted-foreground">Flight: </span>
            <span className="font-bold">{flightNumber}</span>
          </div>
          {aircraft && (
            <div className="text-xs">
              <span className="text-muted-foreground">Aircraft: </span>
              <span className="font-bold">{aircraft}</span>
            </div>
          )}
          <div className="text-xs">
            <span className="text-muted-foreground">Class: </span>
            <span className="font-bold">{cabinClass || "Economy"}</span>
          </div>
        </div>
        {totalSeatCost > 0 && (
          <Badge className="bg-accent/10 text-accent border-accent/20 font-bold">Seat Total: ৳{totalSeatCost.toLocaleString()}</Badge>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px]">
        {[
          { label: "Available", class: "bg-accent/10 border-accent/30" },
          { label: "Selected", class: "bg-accent border-accent" },
          { label: "Occupied", class: "bg-muted/60 border-muted-foreground/20 opacity-50" },
          { label: "Exit Row", class: "bg-red-500/10 border-red-500/30" },
          { label: "Extra Legroom", class: "bg-amber-500/10 border-amber-500/30" },
          { label: "Front Row", class: "bg-emerald-500/10 border-emerald-500/30" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded border ${item.class}`} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Seat grid */}
      <div className="overflow-x-auto pb-2">
        <div className={`mx-auto ${isNarrow ? "max-w-[280px]" : cols >= 9 ? "max-w-[500px]" : "max-w-[380px]"}`}>
          {/* Column headers */}
          <div className="flex items-center justify-center gap-0 mb-1">
            <div className="w-7 shrink-0" />
            {rows[0]?.[1]?.map((seat, i) => {
              const isGap = isNarrow ? i === 2 : cols >= 9 ? (i === 3 || i === 6) : i === 3;
              return (
                <div key={seat.col} className="flex">
                  {isGap && <div className="w-5" />}
                  <div className="w-8 h-6 flex items-center justify-center text-[10px] font-bold text-muted-foreground">{seat.col}</div>
                </div>
              );
            })}
          </div>

          {/* Rows */}
          <div className="space-y-0.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
            {rows.map(([rowNum, rowSeats]) => {
              const isExit = exitRows.has(rowNum);
              return (
                <div key={rowNum} className="relative">
                  {isExit && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 text-[8px] text-red-500 font-bold rotate-90 origin-center">EXIT</div>
                  )}
                  <div className="flex items-center justify-center gap-0">
                    <div className="w-7 shrink-0 text-[10px] text-muted-foreground font-medium text-right pr-1.5">{rowNum}</div>
                    {rowSeats.map((seat, i) => {
                      const displayStatus = getSeatDisplayStatus(seat);
                      const isGap = isNarrow ? i === 2 : cols >= 9 ? (i === 3 || i === 6) : i === 3;
                      const selectedByPax = Object.entries(selectedSeats).find(([, id]) => id === seat.id);
                      return (
                        <div key={seat.id} className="flex">
                          {isGap && <div className="w-5" />}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleSeatClick(seat)}
                                disabled={seat.status === "occupied" || seat.status === "blocked"}
                                className={`w-8 h-7 rounded-t-md border text-[9px] font-bold transition-all relative ${
                                  displayStatus === "selected"
                                    ? seatColors.selected
                                    : displayStatus === "occupied"
                                    ? seatColors.occupied
                                    : seat.type === "exit-row" ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 cursor-pointer"
                                    : seat.type === "extra-legroom" ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                                    : seat.type === "front-row" ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer"
                                    : seatColors.available
                                }`}
                              >
                                {displayStatus === "selected" && selectedByPax
                                  ? <span className="text-[9px]">P{Number(selectedByPax[0]) + 1}</span>
                                  : displayStatus === "occupied" ? <X className="w-3 h-3 mx-auto opacity-40" /> : null
                                }
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-bold">{seat.label} — {typeLabels[seat.type]?.label}</p>
                              {seat.status !== "occupied" && (
                                <p className="text-muted-foreground">{seat.price === 0 ? "Free" : `৳${seat.price}`}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected seats summary */}
      {Object.keys(selectedSeats).length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selected Seats</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(selectedSeats).map(([paxIdx, seatId]) => {
              const seat = seats.find(s => s.id === seatId);
              const pax = passengers[Number(paxIdx)];
              return (
                <div key={paxIdx} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
                  <span className="text-xs font-medium">{pax?.title} {pax?.firstName || `Pax ${Number(paxIdx) + 1}`}</span>
                  <Badge className="bg-accent text-accent-foreground border-0 text-[10px] font-bold h-5">{seatId}</Badge>
                  <span className="text-[10px] text-muted-foreground">{seat?.price === 0 ? "Free" : `৳${seat?.price}`}</span>
                  <button onClick={() => onSeatDeselect(Number(paxIdx))} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>Seat selection is subject to airline confirmation. Final seat assignments will be confirmed at check-in. Seat prices are per passenger per segment.</p>
      </div>
    </div>
  );
};

export default SeatMap;
