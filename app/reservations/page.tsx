'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, CalendarPlus, Clock3, UserRound } from 'lucide-react';
import { toast } from 'sonner';

type Reservation = {
  id: string;
  clientName: string;
  date: string;
  time: string;
  status: 'Confirmed';
};

const today = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

function ReservationsContent() {
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('09:00');
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = clientName.trim();
    if (!name || !date || !time) {
      toast.error('Enter a client name and choose a date and time.');
      return;
    }
    if (date < today()) {
      toast.error('Choose today or a future date.');
      return;
    }
    if (reservations.some((reservation) => reservation.date === date && reservation.time === time)) {
      toast.error('That mock slot is already reserved. Choose another time.');
      return;
    }

    setReservations((previous) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, clientName: name, date, time, status: 'Confirmed' },
      ...previous,
    ]);
    setClientName('');
    toast.success('Mock reservation added. This is saved only for this session.');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Reserve a slot
          </CardTitle>
          <p className="text-sm text-muted-foreground">Create a temporary mock reservation. No appointment data is sent to a server.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="clientName">Patient / client name</Label>
              <Input id="clientName" autoComplete="name" maxLength={100} value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Enter a name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservationDate">Date</Label>
              <Input id="reservationDate" type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservationTime">Time</Label>
              <Input id="reservationTime" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                <CalendarPlus className="mr-2 h-4 w-4" /> Add reservation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-5 w-5 text-primary" />
            Reservations
            <Badge variant="secondary" className="ml-auto">{reservations.length} mock</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <CalendarClock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No reservations yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Use the form above to add a session-only mock reservation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Patient / client</th>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Time</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium"><span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground" />{reservation.clientName}</span></td>
                      <td className="px-3 py-3">{new Date(`${reservation.date}T00:00:00`).toLocaleDateString()}</td>
                      <td className="px-3 py-3"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" />{reservation.time}</span></td>
                      <td className="px-3 py-3"><Badge className="bg-primary/10 text-primary hover:bg-primary/15">{reservation.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Reservations" subtitle="Manage mock appointment slots">
        <ReservationsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
