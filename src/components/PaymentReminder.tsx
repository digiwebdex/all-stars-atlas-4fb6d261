import { AlertTriangle, CreditCard, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface UnpaidBooking {
  id: string;
  bookingRef?: string;
  title?: string;
  amount?: string;
  totalAmount?: number;
  paymentDeadline?: string;
  status?: string;
}

function getTimeLeft(deadline: string): { text: string; urgent: boolean } {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  if (diff <= 0) return { text: "Expired", urgent: true };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return { text: `${days}d ${hours % 24}h left`, urgent: days <= 1 };
  if (hours > 0) return { text: `${hours}h left`, urgent: hours <= 6 };
  const mins = Math.floor(diff / (1000 * 60));
  return { text: `${mins}m left`, urgent: true };
}

export const PaymentReminderBanner = ({ bookings }: { bookings: UnpaidBooking[] }) => {
  const unpaid = bookings.filter(b =>
    b.status?.toLowerCase() === "on_hold" || b.status?.toLowerCase() === "on hold"
  );

  if (unpaid.length === 0) return null;

  return (
    <div className="space-y-2">
      {unpaid.map((booking) => {
        const timeLeft = booking.paymentDeadline ? getTimeLeft(booking.paymentDeadline) : null;
        return (
          <div
            key={booking.id}
            className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border ${
              timeLeft?.urgent
                ? "bg-destructive/5 border-destructive/30"
                : "bg-warning/5 border-warning/30"
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                timeLeft?.urgent ? "bg-destructive/10" : "bg-warning/10"
              }`}>
                <AlertTriangle className={`w-4.5 h-4.5 ${timeLeft?.urgent ? "text-destructive" : "text-warning"}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">
                  Payment Due — {booking.bookingRef || booking.id}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {booking.title || "Flight Booking"} · {booking.amount || `৳${booking.totalAmount?.toLocaleString() || 0}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {timeLeft && (
                <Badge variant="outline" className={`text-[10px] font-bold ${
                  timeLeft.urgent ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"
                }`}>
                  <Timer className="w-3 h-3 mr-1" />
                  {timeLeft.text}
                </Badge>
              )}
              <Button size="sm" className="h-8 text-xs font-bold" asChild>
                <Link to="/dashboard/payments">
                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Pay Now
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PaymentReminderBanner;
