import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
  workHours: number;
  mealAllowance: number;
  isWarning: boolean;
}

const Index = () => {
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const { toast } = useToast();

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedRecords = localStorage.getItem('attendanceRecords');
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    }
  }, []);

  // Save to localStorage whenever records change
  useEffect(() => {
    localStorage.setItem('attendanceRecords', JSON.stringify(records));
  }, [records]);

  const calculateWorkHours = (checkIn: string, checkOut: string): number => {
    const checkInDate = new Date(`2000-01-01T${checkIn}`);
    const checkOutDate = new Date(`2000-01-01T${checkOut}`);
    
    // Handle next day checkout
    if (checkOutDate < checkInDate) {
      checkOutDate.setDate(checkOutDate.getDate() + 1);
    }
    
    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    const grossHours = diffMs / (1000 * 60 * 60); // Convert to hours
    
    // Subtract 1 hour break time
    const netHours = grossHours - 1;
    
    return Math.max(0, netHours); // Ensure no negative hours
  };

  const calculateMealAllowance = (checkIn: string, workHours: number): number => {
    const checkInDate = new Date(`2000-01-01T${checkIn}`);
    const flexiTimeEnd = new Date(`2000-01-01T08:30`);
    
    // If work less than 8 hours, no meal allowance
    if (workHours < 8) return 0;
    
    // If check in on time (<=08:30), full allowance
    if (checkInDate <= flexiTimeEnd) return 60000;
    
    // If check in late (>08:30) but work >=8 hours, reduced allowance
    return 30000;
  };

  const handleSubmit = () => {
    if (!checkInTime || !checkOutTime) {
      toast({
        title: "Error",
        description: "Mohon isi jam datang dan pulang",
        variant: "destructive"
      });
      return;
    }

    const workHours = calculateWorkHours(checkInTime, checkOutTime);
    const mealAllowance = calculateMealAllowance(checkInTime, workHours);
    const isWarning = workHours < 8;
    
    const newRecord: AttendanceRecord = {
      date: format(new Date(), 'yyyy-MM-dd'),
      checkIn: checkInTime,
      checkOut: checkOutTime,
      workHours: Math.round(workHours * 100) / 100, // Round to 2 decimal places
      mealAllowance,
      isWarning
    };

    // Check if record for today already exists
    const existingIndex = records.findIndex(r => r.date === newRecord.date);
    
    if (existingIndex >= 0) {
      // Update existing record
      const updatedRecords = [...records];
      updatedRecords[existingIndex] = newRecord;
      setRecords(updatedRecords);
      toast({
        title: "Berhasil",
        description: "Data absensi hari ini telah diperbarui"
      });
    } else {
      // Add new record
      setRecords([newRecord, ...records]);
      toast({
        title: "Berhasil",
        description: "Data absensi berhasil disimpan"
      });
    }

    // Show warning if work hours < 8
    if (isWarning) {
      toast({
        title: "Peringatan!",
        description: `Jam kerja kurang dari 8 jam (${workHours.toFixed(2)} jam). Tidak mendapat uang makan.`,
        variant: "destructive"
      });
    }

    // Clear form
    setCheckInTime('');
    setCheckOutTime('');
  };

  const getTotalMealAllowance = (): number => {
    return records.reduce((total, record) => total + record.mealAllowance, 0);
  };

  const getCurrentMonthRecords = (): AttendanceRecord[] => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    return records.filter(record => record.date.startsWith(currentMonth));
  };

  const handleTapIn = () => {
    const currentTime = format(new Date(), 'HH:mm');
    setCheckInTime(currentTime);
    toast({
      title: "Tap In Berhasil",
      description: `Jam datang: ${currentTime}`
    });
  };

  const handleTapOut = () => {
    const currentTime = format(new Date(), 'HH:mm');
    setCheckOutTime(currentTime);
    toast({
      title: "Tap Out Berhasil", 
      description: `Jam pulang: ${currentTime}`
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const currentMonthRecords = getCurrentMonthRecords();
  const totalMealAllowance = getTotalMealAllowance();
  const currentMonthMealAllowance = currentMonthRecords.reduce((total, record) => total + record.mealAllowance, 0);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Sistem Absensi & Uang Makan</h1>
          <p className="text-muted-foreground">Tracking absensi dan kalkulasi uang makan harian</p>
        </div>

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Absen Hari Ini - {format(new Date(), 'dd MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tap In/Out Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={handleTapIn}
                variant={checkInTime ? "secondary" : "default"}
                className="w-full h-16 text-lg"
              >
                {checkInTime ? `✓ Tap In: ${checkInTime}` : "🟢 TAP IN"}
              </Button>
              <Button 
                onClick={handleTapOut}
                variant={checkOutTime ? "secondary" : "outline"}
                className="w-full h-16 text-lg"
                disabled={!checkInTime}
              >
                {checkOutTime ? `✓ Tap Out: ${checkOutTime}` : "🔴 TAP OUT"}
              </Button>
            </div>

            {/* Toggle Manual Mode */}
            <div className="flex items-center justify-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsManualMode(!isManualMode)}
              >
                {isManualMode ? "Kembali ke Tap Mode" : "Input Manual"}
              </Button>
            </div>

            {/* Manual Input (hidden by default) */}
            {isManualMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkin">Jam Datang</Label>
                  <Input
                    id="checkin"
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="checkout">Jam Pulang</Label>
                  <Input
                    id="checkout"
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              * Jam kerja sudah dikurangi 1 jam istirahat
            </div>
            <Button onClick={handleSubmit} className="w-full">
              Simpan Absensi
            </Button>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Uang Makan Bulan Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(currentMonthMealAllowance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Dari {currentMonthRecords.length} hari kerja
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Total Hari Kerja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentMonthRecords.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Bulan {format(new Date(), 'MMMM yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Hari Kurang 8 Jam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {currentMonthRecords.filter(r => r.isWarning).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Tidak dapat uang makan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Absensi</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada data absensi
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jam Datang</TableHead>
                      <TableHead>Jam Pulang</TableHead>
                      <TableHead>Jam Kerja</TableHead>
                      <TableHead>Uang Makan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record, index) => (
                      <TableRow key={index} className={record.isWarning ? 'bg-red-50' : ''}>
                        <TableCell>
                          {format(new Date(record.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{record.checkIn}</TableCell>
                        <TableCell>{record.checkOut}</TableCell>
                        <TableCell>
                          {record.workHours.toFixed(2)} jam
                        </TableCell>
                        <TableCell className={record.mealAllowance > 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(record.mealAllowance)}
                        </TableCell>
                        <TableCell>
                          {record.isWarning ? (
                            <Alert className="w-fit">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                Kurang 8 jam
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <span className="text-green-600 text-sm">✓ Normal</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
