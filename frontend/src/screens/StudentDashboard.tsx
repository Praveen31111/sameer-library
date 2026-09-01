import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, FlatList, SafeAreaView, ActivityIndicator, Platform, StatusBar, Modal, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface StudentDashboardProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register') => void;
}

const { width } = Dimensions.get('window');

type TabName = 'Overview' | 'Book' | 'Bookings' | 'Profile';

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('Overview');
  const [loading, setLoading] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [roomModalVisible, setRoomModalVisible] = useState(false);

  // API States
  const [stats, setStats] = useState<{ daysPresent: number; totalHours: number; avgHoursPerDay: string; streak: number } | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  // Interactive Booking state
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [seatsList, setSeatsList] = useState<any[]>([]);
  const [bookingPlan, setBookingPlan] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Fetch Overview data (attendance stats + bookings list)
  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      // 1. Fetch attendance
      const attRes = await apiRequest('/attendance');
      if (attRes.attendance) {
        const formattedLogs = attRes.attendance.map((log: any) => {
          const checkInDate = new Date(log.checkIn);
          let timeString = checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          let checkOutString = 'Active';
          let hoursString = '--';

          if (log.checkOut) {
            const checkOutDate = new Date(log.checkOut);
            checkOutString = checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const diffMs = checkOutDate.getTime() - checkInDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            hoursString = `${hrs}h ${mins}m`;
          }

          const today = new Date().toDateString();
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          const logDateStr = checkInDate.toDateString();

          let dateLabel = checkInDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
          if (logDateStr === today) dateLabel = 'Today';
          else if (logDateStr === yesterday) dateLabel = 'Yesterday';

          return {
            date: dateLabel,
            checkIn: timeString,
            checkOut: checkOutString,
            hours: hoursString,
          };
        });
        setAttendanceLogs(formattedLogs.slice(0, 5)); // show latest 5
      }
      if (attRes.stats) {
        setStats(attRes.stats);
      }

      // 2. Fetch bookings
      const bookRes = await apiRequest('/bookings');
      if (bookRes.bookings) {
        setBookingsList(bookRes.bookings);
      }
    } catch (err: any) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches and rooms for Book Tab
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/branches');
      if (res.branches) {
        setBranches(res.branches);
        if (res.branches.length > 0) {
          // Initialize defaults
          const firstBranch = res.branches[0];
          setSelectedBranchId(firstBranch.id);
          if (firstBranch.rooms && firstBranch.rooms.length > 0) {
            setSelectedRoomId(firstBranch.rooms[0].id);
          } else {
            setSelectedRoomId(null);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch seat layout when room changes
  const fetchSeats = async (roomId: string) => {
    setLoadingSeats(true);
    try {
      const res = await apiRequest(`/rooms/${roomId}/seats`);
      if (res.seats) {
        setSeatsList(res.seats);
      }
    } catch (err: any) {
      console.error('Failed to load seats:', err);
    } finally {
      setLoadingSeats(false);
    }
  };

  // Trigger sync on tab changes
  useEffect(() => {
    if (activeTab === 'Overview' || activeTab === 'Bookings') {
      fetchOverviewData();
    } else if (activeTab === 'Book') {
      fetchBranches();
      setSelectedSeatId(null);
    }
  }, [activeTab]);

  // Sync seats when selected room changes
  useEffect(() => {
    if (selectedRoomId) {
      fetchSeats(selectedRoomId);
      setSelectedSeatId(null);
    } else {
      setSeatsList([]);
    }
  }, [selectedRoomId]);

  const handleLogout = async () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onNavigate('Home');
        },
      },
    ]);
  };

  const handleSeatPress = (seat: any) => {
    if (seat.status === 'blocked' || seat.rawStatus === 'BLOCKED') {
      Alert.alert('Seat Locked 🔒', 'This seat is currently locked/reserved by library management and cannot be booked.');
      return;
    }
    if (seat.status === 'booked') {
      Alert.alert('Seat Occupied', 'This seat is already booked by another student.');
      return;
    }
    setSelectedSeatId(selectedSeatId === seat.id ? null : seat.id);
  };

  // Booking submit + simulation of payment
  const handlePayment = async () => {
    if (!selectedBranchId || !selectedRoomId || !selectedSeatId) {
      Alert.alert('Error', 'Please select a seat to book.');
      return;
    }

    const price = bookingPlan === 'DAILY' ? 50 : bookingPlan === 'WEEKLY' ? 300 : 1000;
    const start = new Date(startDate);
    const end = new Date(start);
    if (bookingPlan === 'DAILY') {
      end.setDate(start.getDate() + 1);
    } else if (bookingPlan === 'WEEKLY') {
      end.setDate(start.getDate() + 7);
    } else if (bookingPlan === 'MONTHLY') {
      end.setDate(start.getDate() + 30);
    }

    setLoading(true);
    try {
      // 1. Submit booking to backend
      const res = await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          branchId: selectedBranchId,
          roomId: selectedRoomId,
          seatId: selectedSeatId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          planType: bookingPlan,
          amount: price,
        }),
      });

      if (res.success && res.booking) {
        const createdBooking = res.booking;
        
        // 2. Automatically trigger simulated payment checkout for local sandbox
        const orderRes = await apiRequest('/payments/create-order', {
          method: 'POST',
          body: JSON.stringify({ bookingId: createdBooking.id }),
        });

        // 3. Complete payment on backend using the dev bypass
        await apiRequest('/payments/verify', {
          method: 'POST',
          body: JSON.stringify({
            bookingId: createdBooking.id,
            razorpayOrderId: orderRes.id,
            razorpayPaymentId: `pay_sandbox_${Math.floor(Math.random() * 1000000)}`,
            razorpaySignature: 'expo-go-mock-signature',
          }),
        });

        setLoading(false);
        setSelectedSeatId(null);
        Alert.alert(
          'Booking Submitted',
          'Aapki seat booking request owner approval ke liye pending me hai. Payment verification hone par automatic activate ho jayega.',
          [
            {
              text: 'View Bookings',
              onPress: () => {
                setActiveTab('Bookings');
              },
            },
          ]
        );
      } else {
        setLoading(false);
        Alert.alert('Booking Failed', res.error || 'Failed to submit booking.');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Booking Error', error.message || 'An error occurred during booking.');
    }
  };

  // Pay Now for previously unpaid bookings
  const handlePayNow = async (booking: any) => {
    setLoading(true);
    try {
      const orderRes = await apiRequest('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id }),
      });

      await apiRequest('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: booking.id,
          razorpayOrderId: orderRes.id,
          razorpayPaymentId: `pay_sandbox_${Math.floor(Math.random() * 1000000)}`,
          razorpaySignature: 'expo-go-mock-signature',
        }),
      });

      setLoading(false);
      Alert.alert('Success', 'Payment completed successfully!', [
        { text: 'OK', onPress: () => fetchOverviewData() }
      ]);
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Payment Failed', err.message || 'Could not complete payment.');
    }
  };



  // Helper variables for rendering selected branch and room text labels & photos
  const currentBranch = branches.find((b) => b.id === selectedBranchId);
  const currentBranchRooms = currentBranch?.rooms || [];
  const currentRoom = currentBranchRooms.find((r: any) => r.id === selectedRoomId);
  const selectedBranchName = currentBranch?.name || 'Select Branch';
  const selectedRoomName = currentRoom?.name || 'Select Room';
  const selectedSeatNumber = seatsList.find((s) => s.id === selectedSeatId)?.seatNumber || '';

  // Sum up all unpaid approved bookings
  const amountDue = bookingsList
    .filter((b) => b.status === 'approved' && b.paymentStatus !== 'success')
    .reduce((sum, b) => sum + b.amount, 0);

  // Active booking calculation: Find the latest active or approved + paid booking
  const activeBooking = bookingsList.find(
    (b) => b.status === 'active' || (b.status === 'approved' && b.paymentStatus === 'success')
  );

  const renderTabContent = () => {
    if (loading && activeTab !== 'Book') {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={{ color: '#a3a3a3', marginTop: 12 }}>Loading portal data...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'Overview':
        return (
          <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
            {/* Header Greeting Banner */}
            <View style={styles.banner}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.bannerTitle} numberOfLines={1} adjustsFontSizeToFit>Hello, {user?.name || 'Sameer'} 👋</Text>
                <Text style={styles.bannerSubtitle}>Welcome back to your study space</Text>
              </View>
              <TouchableOpacity style={styles.bannerBtn} onPress={() => setActiveTab('Book')}>
                <Text style={styles.bannerBtnText}>Book Seat</Text>
                <Ionicons name="add-circle-outline" size={18} color="#0d9488" />
              </TouchableOpacity>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>This Month</Text>
                  <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(13, 148, 136, 0.1)' }]}>
                    <Ionicons name="calendar-outline" size={18} color="#0d9488" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats?.daysPresent || 0}</Text>
                <Text style={styles.statSubText}>Days Attended</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Total Hours</Text>
                  <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name="time-outline" size={18} color="#3b82f6" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats?.totalHours || 0}</Text>
                <Text style={styles.statSubText}>This month</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Amount Due</Text>
                  <View style={[styles.statIconWrapper, { backgroundColor: amountDue > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }]}>
                    <Ionicons name="card-outline" size={18} color={amountDue > 0 ? '#ef4444' : '#22c55e'} />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: amountDue > 0 ? '#ef4444' : '#22c55e' }]}>₹{amountDue}</Text>
                <Text style={[styles.statSubText, { color: amountDue > 0 ? '#ef4444' : '#22c55e' }]}>
                  {amountDue > 0 ? 'Unpaid approved' : 'All paid ✓'}
                </Text>
              </View>
            </View>

            {/* Current Booking Card */}
            <Text style={styles.sectionHeader}>Active Seat Booking</Text>
            {activeBooking ? (
              <View style={styles.bookingCard}>
                <View style={styles.bookingCardHeader}>
                  <View style={styles.seatBadge}>
                    <Text style={styles.seatBadgeText}>{activeBooking.seat}</Text>
                  </View>
                  <View style={styles.bookingCardDetails}>
                    <Text style={styles.bookingTitle}>{activeBooking.room}</Text>
                    <Text style={styles.bookingSubtitle}>{activeBooking.branch}</Text>
                  </View>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>{activeBooking.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.bookingDivider} />
                <View style={styles.bookingMetaRow}>
                  <View>
                    <Text style={styles.metaLabel}>PLAN TYPE</Text>
                    <Text style={styles.metaValue}>{activeBooking.planType}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.metaLabel}>VALID UNTIL</Text>
                    <Text style={styles.metaValue}>
                      {new Date(activeBooking.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.bookingCard, { alignItems: 'center', paddingVertical: 24, gap: 8 }]}>
                <Ionicons name="alert-circle-outline" size={32} color="#525252" />
                <Text style={{ color: '#a3a3a3', fontWeight: '600' }}>No active bookings</Text>
                <Text style={{ color: '#525252', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>
                  Book a study seat to access library facilities.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#262626', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}
                  onPress={() => setActiveTab('Book')}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Book Study Seat</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Recent Attendance Logs */}
            <Text style={styles.sectionHeader}>Recent Attendance</Text>
            <View style={styles.attendanceContainer}>
              {attendanceLogs.length > 0 ? (
                attendanceLogs.map((log, index) => (
                  <View key={index} style={styles.attendanceRow}>
                    <View>
                      <Text style={styles.attendanceDate}>{log.date}</Text>
                      <Text style={styles.attendanceTime}>
                        {log.checkIn} - {log.checkOut}
                      </Text>
                    </View>
                    <View style={styles.hoursBadge}>
                      <Text style={styles.hoursText}>{log.hours}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#525252', fontSize: 13 }}>No attendance records found</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'Book':
        return (
          <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Choose Seat Plan</Text>

              {/* Branch / Room Photo Showcase Card */}
              {(currentRoom?.photo || currentBranch?.photo) && (
                <View style={styles.showcaseCard}>
                  <Image
                    source={{ uri: currentRoom?.photo || currentBranch?.photo }}
                    style={styles.showcaseImage}
                  />
                  <View style={styles.showcaseOverlay}>
                    <Text style={styles.showcaseTitle}>{currentRoom?.name || currentBranch?.name}</Text>
                    <Text style={styles.showcaseSub}>
                      📍 {currentBranch?.name} • 🪑 {currentRoom?.capacity || 20} Seats Capacity
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.formLabel}>Select Branch</Text>
              <TouchableOpacity style={styles.pickerBox} onPress={() => setBranchModalVisible(true)}>
                <Text style={styles.pickerBoxText}>📍 {selectedBranchName}</Text>
              </TouchableOpacity>

              <Text style={styles.formLabel}>Select Room</Text>
              <TouchableOpacity style={styles.pickerBox} onPress={() => setRoomModalVisible(true)}>
                <Text style={styles.pickerBoxText}>🤫 {selectedRoomName}</Text>
              </TouchableOpacity>

              <Text style={styles.formLabel}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.pickerBox, { color: '#ffffff', fontSize: 14 }]}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#525252"
              />

              <Text style={styles.formLabel}>Choose Plan Period</Text>
              <View style={styles.plansContainer}>
                {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((plan) => (
                  <TouchableOpacity
                    key={plan}
                    style={[styles.planTab, bookingPlan === plan && styles.planTabActive]}
                    onPress={() => setBookingPlan(plan)}
                  >
                    <Text style={[styles.planTabText, bookingPlan === plan && styles.planTabTextActive]}>
                      {plan}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Interactive Seat Grid */}
              <View style={styles.gridSection}>
                <Text style={styles.formLabel}>Tap to select an available seat</Text>
                {loadingSeats ? (
                  <ActivityIndicator size="small" color="#0d9488" style={{ marginVertical: 20 }} />
                ) : seatsList.length > 0 ? (
                  <View style={styles.seatGrid}>
                    {seatsList.map((seat) => {
                      const isBlocked = seat.status === 'blocked' || seat.rawStatus === 'BLOCKED';
                      const isBooked = seat.status === 'booked';
                      const isSelected = selectedSeatId === seat.id;

                      return (
                        <TouchableOpacity
                          key={seat.id}
                          activeOpacity={0.7}
                          onPress={() => handleSeatPress(seat)}
                          style={[
                            styles.seatCell,
                            isBlocked && styles.seatCellBlocked,
                            isBooked && styles.seatCellBooked,
                            isSelected && styles.seatCellSelected,
                          ]}
                        >
                          {isBlocked ? (
                            <View style={{ alignItems: 'center' }}>
                              <Ionicons name="lock-closed" size={10} color="#ef4444" />
                              <Text style={styles.seatCellTextBlocked}>{seat.seatNumber}</Text>
                            </View>
                          ) : (
                            <Text
                              style={[
                                styles.seatCellText,
                                isBooked && styles.seatCellTextBooked,
                                isSelected && styles.seatCellTextSelected,
                              ]}
                            >
                              {seat.seatNumber}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#525252', fontSize: 13 }}>No seats available in this room</Text>
                  </View>
                )}

                {/* Grid Legend */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.legendAvailable]} />
                    <Text style={styles.legendLabelText}>Available</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.legendSelected]} />
                    <Text style={styles.legendLabelText}>Selected</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.legendBooked]} />
                    <Text style={styles.legendLabelText}>Booked</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.legendBlocked]} />
                    <Text style={styles.legendLabelText}>Locked</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Check out card */}
            {selectedSeatId && (
              <View style={styles.checkoutCard}>
                <View style={styles.checkoutRow}>
                  <View>
                    <Text style={styles.checkoutLabel}>SELECTED SEAT</Text>
                    <Text style={styles.checkoutValue}>{selectedSeatNumber} ({selectedRoomName})</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.checkoutLabel}>TOTAL AMOUNT</Text>
                    <Text style={styles.checkoutPrice}>
                      ₹{bookingPlan === 'DAILY' ? 50 : bookingPlan === 'WEEKLY' ? 300 : 1000}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.checkoutBtn}
                  onPress={handlePayment}
                  disabled={loading}
                >
                  <Text style={styles.checkoutBtnText}>
                    {loading ? 'Processing...' : 'Confirm & Book (Simulated Pay)'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        );

      case 'Bookings':
        return (
          <FlatList
            data={bookingsList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.flatListContent}
            renderItem={({ item }) => (
              <View style={styles.bookingListItem}>
                <View style={styles.bookingListTop}>
                  <View style={styles.listItemSeat}>
                    <Text style={styles.listItemSeatText}>{item.seat}</Text>
                  </View>
                  <View style={styles.listItemDetails}>
                    <Text style={styles.listItemTitle}>{item.room}</Text>
                    <Text style={styles.listItemSubtitle}>{item.branch}</Text>
                    <Text style={styles.listItemDate}>
                      Validity: {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'approved' && styles.statusApproved,
                        item.status === 'active' && styles.statusApproved,
                        item.status === 'pending' && styles.statusPending,
                        item.status === 'completed' && styles.statusCompleted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          (item.status === 'approved' || item.status === 'active') && styles.statusTextApproved,
                          item.status === 'pending' && styles.statusTextPending,
                          item.status === 'completed' && styles.statusTextCompleted,
                        ]}
                      >
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                    {item.paymentStatus === 'success' ? (
                      <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 }}>
                        <Text style={{ color: '#22c55e', fontSize: 8, fontWeight: '700' }}>PAID</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 }}>
                        <Text style={{ color: '#ef4444', fontSize: 8, fontWeight: '700' }}>UNPAID</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.listItemDivider} />
                <View style={styles.bookingListBottom}>
                  <Text style={styles.listItemPlanText}>Plan: {item.planType}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={styles.listItemPriceText}>₹{item.amount}</Text>
                    {item.status === 'approved' && item.paymentStatus !== 'success' && (
                      <TouchableOpacity
                        style={{ backgroundColor: '#0d9488', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 }}
                        onPress={() => handlePayNow(item)}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>Pay Now</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
            ListHeaderComponent={<Text style={styles.flatListHeader}>Booking History</Text>}
            ListEmptyComponent={<Text style={styles.emptyText}>No bookings found</Text>}
          />
        );

      case 'Profile':
        return (
          <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.profileCard}>
              <View style={styles.avatarSection}>
                <View style={styles.avatarWrapper}>
                  <Ionicons name="person" size={44} color="#ffffff" />
                </View>
                <Text style={styles.profileName}>{user?.name || 'Sameer Student'}</Text>
                <Text style={styles.profileRole}>STUDENT MEMBERSHIP</Text>
              </View>

              <View style={styles.profileDetailsList}>
                <View style={styles.profileDetailItem}>
                  <Ionicons name="mail" size={20} color="#a3a3a3" />
                  <View>
                    <Text style={styles.detailLabel}>Email Address</Text>
                    <Text style={styles.detailValue}>{user?.email || 'student@gmail.com'}</Text>
                  </View>
                </View>

                <View style={styles.profileDetailItem}>
                  <Ionicons name="call" size={20} color="#a3a3a3" />
                  <View>
                    <Text style={styles.detailLabel}>Phone Number</Text>
                    <Text style={styles.detailValue}>{user?.phone || 'Not Provided'}</Text>
                  </View>
                </View>

                <View style={styles.profileDetailItem}>
                  <Ionicons name="school" size={20} color="#a3a3a3" />
                  <View>
                    <Text style={styles.detailLabel}>College</Text>
                    <Text style={styles.detailValue}>{user?.college || 'Not Provided'}</Text>
                  </View>
                </View>

                <View style={styles.profileDetailItem}>
                  <Ionicons name="book-outline" size={20} color="#a3a3a3" />
                  <View>
                    <Text style={styles.detailLabel}>Course</Text>
                    <Text style={styles.detailValue}>{user?.course || 'Not Provided'}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ffffff" />
                <Text style={styles.logoutButtonText}>Log Out Account</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Portal</Text>
      </View>

      {/* Main Tab Area */}
      <View style={styles.contentArea}>
        {renderTabContent()}
      </View>

      {/* Bottom Navigation Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Overview' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Overview')}
        >
          <Ionicons
            name={activeTab === 'Overview' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'Overview' ? '#0d9488' : '#a3a3a3'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'Overview' && styles.tabButtonTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Book' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Book')}
        >
          <Ionicons
            name={activeTab === 'Book' ? 'add-circle' : 'add-circle-outline'}
            size={22}
            color={activeTab === 'Book' ? '#0d9488' : '#a3a3a3'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'Book' && styles.tabButtonTextActive]}>Book Seat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Bookings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Bookings')}
        >
          <Ionicons
            name={activeTab === 'Bookings' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={activeTab === 'Bookings' ? '#0d9488' : '#a3a3a3'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'Bookings' && styles.tabButtonTextActive]}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Profile' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Profile')}
        >
          <Ionicons
            name={activeTab === 'Profile' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'Profile' ? '#0d9488' : '#a3a3a3'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'Profile' && styles.tabButtonTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Branch Selection Custom Modal */}
      <Modal
        visible={branchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setBranchModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Branch</Text>
              <TouchableOpacity onPress={() => setBranchModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {branches.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.modalOption,
                    selectedBranchId === b.id && styles.modalOptionActive
                  ]}
                  onPress={() => {
                    setSelectedBranchId(b.id);
                    if (b.rooms && b.rooms.length > 0) {
                      setSelectedRoomId(b.rooms[0].id);
                    } else {
                      setSelectedRoomId(null);
                    }
                    setBranchModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedBranchId === b.id && styles.modalOptionTextActive
                  ]}>
                    {b.name}
                  </Text>
                  {selectedBranchId === b.id && (
                    <Ionicons name="checkmark" size={20} color="#0d9488" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setBranchModalVisible(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Room Selection Custom Modal */}
      <Modal
        visible={roomModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRoomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRoomModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Room</Text>
              <TouchableOpacity onPress={() => setRoomModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {currentBranchRooms.map((r: any) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.modalOption,
                    selectedRoomId === r.id && styles.modalOptionActive
                  ]}
                  onPress={() => {
                    setSelectedRoomId(r.id);
                    setRoomModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedRoomId === r.id && styles.modalOptionTextActive
                  ]}>
                    {r.name}
                  </Text>
                  {selectedRoomId === r.id && (
                    <Ionicons name="checkmark" size={20} color="#0d9488" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRoomModalVisible(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Android SafeArea Fix
  },
  header: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e', // Thin gray border
    backgroundColor: '#000000',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  contentArea: {
    flex: 1,
  },
  tabScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c1c1e', // Apple Card Background
    borderColor: '#2c2c2e',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  bannerSubtitle: {
    color: '#8e8e93', // Apple system gray
    fontSize: 13,
    marginTop: 4,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d9488', // Teal accent button
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20, // Apple pill shape
  },
  bannerBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 14,
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '600',
  },
  statIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  statSubText: {
    fontSize: 10,
    color: '#8e8e93',
    marginTop: 2,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  bookingCard: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seatBadge: {
    width: 40,
    height: 40,
    backgroundColor: '#0d9488',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bookingCardDetails: {
    flex: 1,
  },
  bookingTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bookingSubtitle: {
    color: '#8e8e93',
    fontSize: 13,
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  activeBadgeText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '700',
  },
  bookingDivider: {
    height: 0.5,
    backgroundColor: '#2c2c2e',
    marginVertical: 14,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '600',
  },
  metaValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  attendanceContainer: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2c2c2e',
  },
  attendanceDate: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  attendanceTime: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  hoursBadge: {
    backgroundColor: '#2c2c2e',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  hoursText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  formCardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  formLabel: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pickerBox: {
    backgroundColor: '#2c2c2e',
    borderColor: '#3a3a3c',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  pickerBoxText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  plansContainer: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  planTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  planTabActive: {
    backgroundColor: '#0d9488',
  },
  planTabText: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '700',
  },
  planTabTextActive: {
    color: '#ffffff',
  },
  gridSection: {
    marginTop: 10,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 16,
  },
  seatCell: {
    width: (width - 88) / 5, // Exact responsive width calculation
    height: 44,
    borderColor: '#0d9488',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  seatCellBooked: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  seatCellBlocked: {
    borderColor: '#525252',
    backgroundColor: '#1c1c1e',
  },
  seatCellSelected: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  seatCellText: {
    color: '#0d9488',
    fontSize: 13,
    fontWeight: '700',
  },
  seatCellTextBooked: {
    color: '#ef4444',
  },
  seatCellTextBlocked: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '700',
  },
  seatCellTextSelected: {
    color: '#ffffff',
  },
  showcaseCard: {
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    backgroundColor: '#1c1c1e',
  },
  showcaseImage: {
    width: '100%',
    height: '100%',
  },
  showcaseOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
  },
  showcaseTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  showcaseSub: {
    color: '#0d9488',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#2c2c2e',
    paddingTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendBox: {
    width: 11,
    height: 11,
    borderRadius: 3,
  },
  legendAvailable: {
    borderWidth: 1,
    borderColor: '#0d9488',
  },
  legendSelected: {
    backgroundColor: '#0d9488',
  },
  legendBooked: {
    backgroundColor: '#ef4444',
  },
  legendBlocked: {
    backgroundColor: '#2c2c2e',
    borderColor: '#525252',
    borderWidth: 1,
  },
  legendLabelText: {
    color: '#8e8e93',
    fontSize: 11,
  },
  checkoutCard: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#0d9488',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  checkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  checkoutLabel: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '600',
  },
  checkoutValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  checkoutPrice: {
    color: '#0d9488',
    fontSize: 20,
    fontWeight: '800',
  },
  checkoutBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  flatListContent: {
    padding: 20,
    paddingBottom: 40,
  },
  flatListHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 30,
  },
  bookingListItem: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    padding: 16,
    marginBottom: 12,
  },
  bookingListTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemSeat: {
    width: 36,
    height: 36,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemSeatText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  listItemDetails: {
    flex: 1,
  },
  listItemTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  listItemSubtitle: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  listItemDate: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 2,
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusCompleted: {
    backgroundColor: 'rgba(163, 163, 163, 0.1)',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusTextApproved: {
    color: '#22c55e',
  },
  statusTextPending: {
    color: '#f59e0b',
  },
  statusTextCompleted: {
    color: '#8e8e93',
  },
  listItemDivider: {
    height: 0.5,
    backgroundColor: '#2c2c2e',
    marginVertical: 12,
  },
  bookingListBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemPlanText: {
    color: '#8e8e93',
    fontSize: 12,
  },
  listItemPriceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  profileCard: {
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    backgroundColor: '#0d9488',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  profileRole: {
    color: '#0d9488',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },
  profileDetailsList: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 16,
    width: '100%',
    padding: 16,
    gap: 16,
    marginBottom: 30,
  },
  profileDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailLabel: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '600',
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    height: 65,
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#1c1c1e',
    backgroundColor: '#000000',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabButtonActive: {},
  tabButtonText: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  tabButtonTextActive: {
    color: '#0d9488',
  },
  
  // Custom Selection Modal Styling (Steve Jobs iOS sheets)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2c2c2e',
    paddingBottom: 14,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2c2c2e',
  },
  modalOptionActive: {
    borderBottomColor: '#0d9488',
  },
  modalOptionText: {
    color: '#e5e5ea',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOptionTextActive: {
    color: '#0d9488',
    fontWeight: '700',
  },
  modalCancelBtn: {
    backgroundColor: '#2c2c2e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
export default StudentDashboard;
