import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  SafeAreaView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface AdminDashboardProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard') => void;
}

const { width } = Dimensions.get('window');

type AdminTab = 'Overview' | 'Bookings' | 'Facilities' | 'Live' | 'Students' | 'Logs';

// Curated high-aesthetic modern study spaces
const PHOTO_PRESETS = [
  { label: 'Modern Hall', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80' },
  { label: 'Silent Zone', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cubicles', url: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=800&q=80' },
  { label: 'Discussion Lounge', url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80' },
  { label: 'Classic Library', url: 'https://images.unsplash.com/photo-1507842229452-e56598c19958?auto=format&fit=crop&w=800&q=80' },
  { label: 'Executive AC Room', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('Overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Overview Stats
  const [statsData, setStatsData] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // 2. Bookings Management
  const [bookingFilter, setBookingFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingActionLoading, setBookingActionLoading] = useState<string | null>(null);

  // 3. Facilities State (Branches -> Rooms -> Seats)
  const [facilityLevel, setFacilityLevel] = useState<'branches' | 'rooms' | 'seats'>('branches');
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomSeats, setRoomSeats] = useState<any[]>([]);

  // Branch Creation & Edit State
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchPhoto, setBranchPhoto] = useState(PHOTO_PRESETS[0].url);

  // Room Creation & Edit State
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('20');
  const [roomPhoto, setRoomPhoto] = useState(PHOTO_PRESETS[1].url);

  // Seats State
  const [addSeatModal, setAddSeatModal] = useState(false);
  const [newSeatCount, setNewSeatCount] = useState('5');

  // 4. Live Seats State
  const [liveSeats, setLiveSeats] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [selectedOccupant, setSelectedOccupant] = useState<any>(null);
  const [occupantModalVisible, setOccupantModalVisible] = useState(false);

  // 5. Students Directory State
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 6. Logs State
  const [logsSubTab, setLogsSubTab] = useState<'Attendance' | 'Payments'>('Attendance');
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);

  // API Call: Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await apiRequest('/admin/stats');
      if (res.stats) setStatsData(res.stats);
      if (res.occupancyData) setOccupancyData(res.occupancyData);
      if (res.recentActivity) setRecentActivity(res.recentActivity);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // API Call: Fetch Bookings
  const fetchBookings = async (status: string) => {
    try {
      const endpoint = status === 'ALL' ? '/admin/bookings' : `/admin/bookings?status=${status}`;
      const res = await apiRequest(endpoint);
      if (res.bookings) setBookings(res.bookings);
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  // API Call: Fetch Branches
  const fetchBranches = async () => {
    try {
      const res = await apiRequest('/admin/branches');
      if (res.branches) setBranchesList(res.branches);
    } catch (err: any) {
      console.error('Failed to fetch branches:', err);
    }
  };

  // API Call: Fetch Rooms for selected branch
  const fetchRoomsForBranch = async (branchId: string) => {
    try {
      const res = await apiRequest(`/admin/rooms?branchId=${branchId}`);
      if (res.rooms) setRoomsList(res.rooms);
    } catch (err: any) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  // API Call: Fetch Seats for selected room
  const fetchSeatsForRoom = async (roomId: string) => {
    try {
      const res = await apiRequest(`/rooms/${roomId}/seats`);
      if (res.seats) setRoomSeats(res.seats);
    } catch (err: any) {
      console.error('Failed to fetch seats:', err);
    }
  };

  // API Call: Fetch Live Seats
  const fetchLiveSeats = async () => {
    try {
      const res = await apiRequest('/admin/live');
      if (res.seats) setLiveSeats(res.seats);
      if (res.stats) setLiveStats(res.stats);
    } catch (err: any) {
      console.error('Failed to fetch live seats:', err);
    }
  };

  // API Call: Fetch Students
  const fetchStudents = async () => {
    try {
      const res = await apiRequest('/admin/students');
      if (res.students) setStudents(res.students);
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
    }
  };

  // API Call: Fetch Logs
  const fetchLogs = async () => {
    try {
      const [attRes, payRes] = await Promise.all([
        apiRequest('/admin/attendance'),
        apiRequest('/admin/payments'),
      ]);
      if (attRes.attendance) setAttendanceLogs(attRes.attendance);
      if (payRes.payments) setPaymentLogs(payRes.payments);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
    }
  };

  // Main Active Tab Loader
  const loadActiveTabData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'Overview') await fetchStats();
    else if (activeTab === 'Bookings') await fetchBookings(bookingFilter);
    else if (activeTab === 'Facilities') {
      if (facilityLevel === 'branches') await fetchBranches();
      else if (facilityLevel === 'rooms' && selectedBranch) await fetchRoomsForBranch(selectedBranch.id);
      else if (facilityLevel === 'seats' && selectedRoom) await fetchSeatsForRoom(selectedRoom.id);
    } else if (activeTab === 'Live') await fetchLiveSeats();
    else if (activeTab === 'Students') await fetchStudents();
    else if (activeTab === 'Logs') await fetchLogs();
    setLoading(false);
  }, [activeTab, bookingFilter, facilityLevel, selectedBranch, selectedRoom]);

  useEffect(() => {
    loadActiveTabData();
  }, [loadActiveTabData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveTabData();
    setRefreshing(false);
  };

  // Open Branch Modal (Create or Edit)
  const handleOpenBranchModal = (branchToEdit?: any) => {
    if (branchToEdit) {
      setEditingBranchId(branchToEdit.id);
      setBranchName(branchToEdit.name || '');
      setBranchCode(branchToEdit.code || '');
      setBranchAddress(branchToEdit.address || '');
      setBranchCity(branchToEdit.city || '');
      setBranchPhoto(branchToEdit.photo || PHOTO_PRESETS[0].url);
    } else {
      setEditingBranchId(null);
      setBranchName('');
      setBranchCode('');
      setBranchAddress('');
      setBranchCity('');
      setBranchPhoto(PHOTO_PRESETS[0].url);
    }
    setBranchModalVisible(true);
  };

  // Save Branch (Create / Update)
  const handleSaveBranch = async () => {
    if (!branchName || (!editingBranchId && !branchCode)) {
      Alert.alert('Required Fields', 'Please enter branch name and code.');
      return;
    }
    setLoading(true);
    try {
      if (editingBranchId) {
        // Update Branch
        const res = await apiRequest('/admin/branches', {
          method: 'PATCH',
          body: JSON.stringify({
            id: editingBranchId,
            name: branchName,
            address: branchAddress,
            city: branchCity,
            photo: branchPhoto,
          }),
        });
        if (res.success) {
          Alert.alert('Success', `Branch "${branchName}" updated successfully!`);
          setBranchModalVisible(false);
          fetchBranches();
        } else {
          Alert.alert('Error', res.error || 'Failed to update branch');
        }
      } else {
        // Create Branch
        const res = await apiRequest('/admin/branches', {
          method: 'POST',
          body: JSON.stringify({
            name: branchName,
            code: branchCode.toUpperCase(),
            address: branchAddress,
            city: branchCity,
            photo: branchPhoto,
          }),
        });
        if (res.success) {
          Alert.alert('Success', `Branch "${branchName}" created!`);
          setBranchModalVisible(false);
          fetchBranches();
        } else {
          Alert.alert('Error', res.error || 'Failed to create branch');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  // Delete Branch
  const handleDeleteBranch = (branchId: string, branchName: string) => {
    Alert.alert('Delete Branch', `Are you sure you want to delete "${branchName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiRequest(`/admin/branches?id=${branchId}`, { method: 'DELETE' });
            if (res.success) {
              Alert.alert('Deleted', 'Branch deleted successfully');
              fetchBranches();
            } else {
              Alert.alert('Error', res.error || 'Failed to delete branch');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // Open Room Modal (Create or Edit)
  const handleOpenRoomModal = (roomToEdit?: any) => {
    if (roomToEdit) {
      setEditingRoomId(roomToEdit.id);
      setRoomName(roomToEdit.name || '');
      setRoomCapacity(String(roomToEdit.capacity || 20));
      setRoomPhoto(roomToEdit.photo || PHOTO_PRESETS[1].url);
    } else {
      setEditingRoomId(null);
      setRoomName('');
      setRoomCapacity('20');
      setRoomPhoto(PHOTO_PRESETS[1].url);
    }
    setRoomModalVisible(true);
  };

  // Save Room (Create / Update)
  const handleSaveRoom = async () => {
    if (!roomName) {
      Alert.alert('Required Fields', 'Please enter room name');
      return;
    }
    setLoading(true);
    try {
      if (editingRoomId) {
        // Update Room
        const res = await apiRequest('/admin/rooms', {
          method: 'PATCH',
          body: JSON.stringify({
            id: editingRoomId,
            name: roomName,
            capacity: parseInt(roomCapacity) || 20,
            photo: roomPhoto,
          }),
        });
        if (res.success) {
          Alert.alert('Success', `Room "${roomName}" updated!`);
          setRoomModalVisible(false);
          fetchRoomsForBranch(selectedBranch.id);
        } else {
          Alert.alert('Error', res.error || 'Failed to update room');
        }
      } else {
        // Create Room
        const res = await apiRequest('/admin/rooms', {
          method: 'POST',
          body: JSON.stringify({
            branchId: selectedBranch.id,
            name: roomName,
            capacity: parseInt(roomCapacity) || 20,
            photo: roomPhoto,
          }),
        });
        if (res.success) {
          Alert.alert('Success', `Room "${roomName}" created!`);
          setRoomModalVisible(false);
          fetchRoomsForBranch(selectedBranch.id);
        } else {
          Alert.alert('Error', res.error || 'Failed to create room');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = (roomId: string, roomName: string) => {
    Alert.alert('Delete Room', `Are you sure you want to delete room "${roomName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiRequest(`/admin/rooms?id=${roomId}`, { method: 'DELETE' });
            if (res.success) {
              Alert.alert('Deleted', 'Room deleted successfully');
              fetchRoomsForBranch(selectedBranch.id);
            } else {
              Alert.alert('Error', res.error || 'Failed to delete room');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // Add Seats (Batch)
  const handleAddSeats = async () => {
    if (!selectedRoom) return;
    const count = parseInt(newSeatCount) || 5;
    setLoading(true);
    try {
      const res = await apiRequest(`/rooms/${selectedRoom.id}/seats`, {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
      if (res.success) {
        Alert.alert('Seats Generated', `Successfully added ${count} new seats!`);
        setAddSeatModal(false);
        fetchSeatsForRoom(selectedRoom.id);
      } else {
        Alert.alert('Error', res.error || 'Failed to generate seats');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1-Tap Lock / Unlock / Delete Seat
  const handleSeatAction = async (seat: any, action: 'BLOCK' | 'UNBLOCK' | 'DELETE') => {
    const actionName = action === 'BLOCK' ? 'Lock/Block' : action === 'UNBLOCK' ? 'Unlock' : 'Delete';
    Alert.alert(
      `${actionName} Seat`,
      `Are you sure you want to ${actionName.toLowerCase()} seat ${seat.seatNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionName,
          style: action === 'DELETE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const res = await apiRequest(`/rooms/${selectedRoom.id}/seats`, {
                method: 'PATCH',
                body: JSON.stringify({ seatId: seat.id, action }),
              });
              if (res.success) {
                fetchSeatsForRoom(selectedRoom.id);
              } else {
                Alert.alert('Error', res.error || 'Action failed');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Approve / Reject Booking
  const handleBookingAction = async (bookingId: string, action: 'approve' | 'reject') => {
    const actionLabel = action === 'approve' ? 'Approve' : 'Reject';
    Alert.alert(`Confirm ${actionLabel}`, `Are you sure you want to ${action} this booking request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionLabel,
        style: action === 'reject' ? 'destructive' : 'default',
        onPress: async () => {
          setBookingActionLoading(bookingId);
          try {
            const res = await apiRequest('/admin/bookings', {
              method: 'POST',
              body: JSON.stringify({ bookingId, action }),
            });
            if (res.success) {
              Alert.alert('Success', `Booking ${action}d successfully!`);
              fetchBookings(bookingFilter);
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setBookingActionLoading(null);
          }
        },
      },
    ]);
  };

  // Delete Student
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    Alert.alert('Delete Student', `Permanently delete student ${studentName}? All related bookings and attendance will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiRequest(`/admin/students?id=${studentId}`, { method: 'DELETE' });
            if (res.success) {
              Alert.alert('Deleted', 'Student record deleted successfully');
              fetchStudents();
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out from Admin Portal?', [
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

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery))
  );

  const renderTabContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Syncing records...</Text>
        </View>
      );
    }

    switch (activeTab) {
      // 1. OVERVIEW TAB
      case 'Overview':
        return (
          <ScrollView
            contentContainerStyle={styles.tabScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
          >
            {/* Metric Cards Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>MONTH REVENUE</Text>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(13, 148, 136, 0.15)' }]}>
                    <Ionicons name="cash-outline" size={18} color="#0d9488" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: '#0d9488' }]}>
                  ₹{statsData?.revenue?.toLocaleString() || 0}
                </Text>
                <Text style={styles.statSubText}>Current Month Total</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>STUDENTS</Text>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <Ionicons name="people-outline" size={18} color="#6366f1" />
                  </View>
                </View>
                <Text style={styles.statValue}>{statsData?.totalStudents || 0}</Text>
                <Text style={styles.statSubText}>Enrolled Profiles</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>ACTIVE BOOKINGS</Text>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name="calendar-outline" size={18} color="#f59e0b" />
                  </View>
                </View>
                <Text style={styles.statValue}>{statsData?.activeBookings || 0}</Text>
                <Text style={styles.statSubText}>Occupied Seats</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>OCCUPANCY</Text>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                    <Ionicons name="pie-chart-outline" size={18} color="#a855f7" />
                  </View>
                </View>
                <Text style={styles.statValue}>{statsData?.occupancyRate || 0}%</Text>
                <Text style={styles.statSubText}>Out of {statsData?.totalSeats || 0} Seats</Text>
              </View>
            </View>

            {/* Room Occupancy */}
            <Text style={styles.sectionTitle}>Room Occupancy Progress</Text>
            <View style={styles.card}>
              {occupancyData.length > 0 ? (
                occupancyData.map((room, idx) => (
                  <View key={idx} style={styles.occupancyItem}>
                    <View style={styles.occupancyTop}>
                      <Text style={styles.occupancyRoomName}>{room.room}</Text>
                      <Text style={styles.occupancyCount}>
                        {room.occupied} / {room.total} ({room.percentage}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(room.percentage, 100)}%` }]} />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No room data available</Text>
              )}
            </View>

            {/* Live Activity Stream */}
            <Text style={styles.sectionTitle}>Live Activity Feed</Text>
            <View style={styles.card}>
              {recentActivity.length > 0 ? (
                recentActivity.map((act, index) => (
                  <View key={index} style={styles.activityRow}>
                    <View
                      style={[
                        styles.activityDot,
                        act.type === 'booking' && { backgroundColor: '#f59e0b' },
                        act.type === 'payment' && { backgroundColor: '#0d9488' },
                        act.type === 'checkin' && { backgroundColor: '#6366f1' },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityEvent}>{act.event}</Text>
                      <Text style={styles.activityTime}>{act.time}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No recent activity logged</Text>
              )}
            </View>
          </ScrollView>
        );

      // 2. BOOKINGS TAB
      case 'Bookings':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.filterContainer}>
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterBtn, bookingFilter === filter && styles.filterBtnActive]}
                  onPress={() => setBookingFilter(filter)}
                >
                  <Text style={[styles.filterBtnText, bookingFilter === filter && styles.filterBtnTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatListContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
              renderItem={({ item }) => (
                <View style={styles.bookingItemCard}>
                  <View style={styles.bookingHeaderRow}>
                    <View style={styles.bookingStudentInfo}>
                      <Text style={styles.bookingStudentName}>{item.student?.name || 'Student'}</Text>
                      <Text style={styles.bookingStudentEmail}>{item.student?.email || 'N/A'}</Text>
                      {item.student?.phone && <Text style={styles.bookingStudentPhone}>📞 {item.student.phone}</Text>}
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'approved' && styles.statusApproved,
                        item.status === 'pending' && styles.statusPending,
                        item.status === 'rejected' && styles.statusRejected,
                      ]}
                    >
                      <Text style={styles.statusPillText}>{item.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.bookingDetailsGrid}>
                    <View>
                      <Text style={styles.detailLabel}>SEAT & ROOM</Text>
                      <Text style={styles.detailValue}>
                        Seat {item.seat} • {item.room}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.detailLabel}>AMOUNT & PLAN</Text>
                      <Text style={[styles.detailValue, { color: '#0d9488', fontWeight: '700' }]}>
                        ₹{item.amount} ({item.planType})
                      </Text>
                    </View>
                  </View>
                  {item.status === 'pending' && (
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleBookingAction(item.id, 'reject')}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleBookingAction(item.id, 'approve')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                        <Text style={styles.approveButtonText}>Approve Seat</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No {bookingFilter.toLowerCase()} bookings</Text>}
            />
          </View>
        );

      // 3. FACILITIES TAB (Branches -> Rooms -> Seats with Edit & Photo Showcase)
      case 'Facilities':
        return (
          <View style={{ flex: 1 }}>
            {/* Top Level Navigation Header */}
            <View style={styles.facilityNavRow}>
              {facilityLevel !== 'branches' ? (
                <TouchableOpacity
                  style={styles.backLevelBtn}
                  onPress={() => {
                    if (facilityLevel === 'seats') setFacilityLevel('rooms');
                    else if (facilityLevel === 'rooms') setFacilityLevel('branches');
                  }}
                >
                  <Ionicons name="arrow-back" size={18} color="#ffffff" />
                  <Text style={styles.backLevelText}>
                    {facilityLevel === 'seats' ? selectedBranch?.name : 'All Branches'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.facilityLevelTitle}>Library Facilities</Text>
              )}

              <TouchableOpacity
                style={styles.addLevelBtn}
                onPress={() => {
                  if (facilityLevel === 'branches') handleOpenBranchModal();
                  else if (facilityLevel === 'rooms') handleOpenRoomModal();
                  else if (facilityLevel === 'seats') setAddSeatModal(true);
                }}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.addLevelBtnText}>
                  {facilityLevel === 'branches' && 'Add Branch'}
                  {facilityLevel === 'rooms' && 'Add Room'}
                  {facilityLevel === 'seats' && 'Add Seats'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* LEVEL 1: Branches List */}
            {facilityLevel === 'branches' && (
              <FlatList
                data={branchesList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flatListContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
                renderItem={({ item }) => (
                  <View style={styles.facilityCard}>
                    {item.photo ? (
                      <Image source={{ uri: item.photo }} style={styles.facilityImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.facilityImage, styles.facilityImagePlaceholder]}>
                        <Ionicons name="business-outline" size={40} color="#525252" />
                      </View>
                    )}
                    <View style={styles.facilityCardBody}>
                      <View style={styles.facilityHeaderRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.facilityCardTitle}>{item.name}</Text>
                          <Text style={styles.facilityCardSub}>📍 {item.address || 'Address not set'} • {item.city || 'City'}</Text>
                        </View>
                        <View style={styles.facilityActionGroup}>
                          <TouchableOpacity
                            style={styles.editIconBtn}
                            onPress={() => handleOpenBranchModal(item)}
                          >
                            <Ionicons name="pencil" size={16} color="#0d9488" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteIconBtn}
                            onPress={() => handleDeleteBranch(item.id, item.name)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.facilityCardStats}>
                        <Text style={styles.facilityStatPill}>🚪 {item.roomCount} Rooms</Text>
                        <Text style={styles.facilityStatPill}>🪑 {item.totalSeats} Total Seats</Text>
                        <TouchableOpacity
                          style={styles.managePillBtn}
                          onPress={() => {
                            setSelectedBranch(item);
                            setFacilityLevel('rooms');
                          }}
                        >
                          <Text style={styles.managePillText}>Manage Rooms →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No branches configured</Text>}
              />
            )}

            {/* LEVEL 2: Rooms List */}
            {facilityLevel === 'rooms' && (
              <FlatList
                data={roomsList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flatListContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
                renderItem={({ item }) => (
                  <View style={styles.facilityCard}>
                    {item.photo ? (
                      <Image source={{ uri: item.photo }} style={styles.facilityImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.facilityImage, styles.facilityImagePlaceholder]}>
                        <Ionicons name="easel-outline" size={40} color="#525252" />
                      </View>
                    )}
                    <View style={styles.facilityCardBody}>
                      <View style={styles.facilityHeaderRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.facilityCardTitle}>{item.name}</Text>
                          <Text style={styles.facilityCardSub}>Capacity: {item.capacity} Seats • Configured: {item.seatCount} Seats</Text>
                        </View>
                        <View style={styles.facilityActionGroup}>
                          <TouchableOpacity
                            style={styles.editIconBtn}
                            onPress={() => handleOpenRoomModal(item)}
                          >
                            <Ionicons name="pencil" size={16} color="#0d9488" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteIconBtn}
                            onPress={() => handleDeleteRoom(item.id, item.name)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.facilityCardStats}>
                        <TouchableOpacity
                          style={[styles.managePillBtn, { width: '100%', alignItems: 'center' }]}
                          onPress={() => {
                            setSelectedRoom(item);
                            setFacilityLevel('seats');
                          }}
                        >
                          <Text style={styles.managePillText}>🪑 Configure & Lock Seats →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No rooms in this branch</Text>}
              />
            )}

            {/* LEVEL 3: Seats List & 🔒 Lock/Block Controls */}
            {facilityLevel === 'seats' && (
              <ScrollView
                contentContainerStyle={styles.tabScroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
              >
                <Text style={styles.subHelpText}>Tap 🔒 to Lock (Block) or 🔓 to Unlock any seat in real-time</Text>

                <View style={styles.seatManageGrid}>
                  {roomSeats.map((seat) => {
                    const isBlocked = seat.status === 'blocked' || seat.rawStatus === 'BLOCKED';
                    const isBooked = seat.status === 'booked';

                    return (
                      <View
                        key={seat.id}
                        style={[
                          styles.seatManageCard,
                          isBlocked && styles.seatManageCardBlocked,
                          isBooked && styles.seatManageCardBooked,
                        ]}
                      >
                        <View style={styles.seatManageHeader}>
                          <Text style={[styles.seatManageNum, isBlocked && { color: '#ef4444' }]}>
                            {seat.seatNumber}
                          </Text>
                          <View
                            style={[
                              styles.statusPill,
                              isBlocked ? styles.statusRejected : isBooked ? styles.statusPending : styles.statusApproved,
                            ]}
                          >
                            <Text style={styles.statusPillText}>
                              {isBlocked ? 'LOCKED' : isBooked ? 'BOOKED' : 'OPEN'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.seatManageActions}>
                          {isBlocked ? (
                            <TouchableOpacity
                              style={styles.seatUnlockBtn}
                              onPress={() => handleSeatAction(seat, 'UNBLOCK')}
                            >
                              <Ionicons name="lock-open-outline" size={13} color="#22c55e" />
                              <Text style={styles.seatUnlockBtnText}>Unlock</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.seatLockBtn}
                              onPress={() => handleSeatAction(seat, 'BLOCK')}
                            >
                              <Ionicons name="lock-closed-outline" size={13} color="#ef4444" />
                              <Text style={styles.seatLockBtnText}>Lock</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={styles.seatDeleteBtn}
                            onPress={() => handleSeatAction(seat, 'DELETE')}
                          >
                            <Ionicons name="trash-outline" size={13} color="#8e8e93" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        );

      // 4. LIVE SEATS VISUALIZER TAB
      case 'Live':
        return (
          <ScrollView
            contentContainerStyle={styles.tabScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
          >
            <View style={styles.liveStatsRow}>
              <View style={[styles.liveStatPill, { backgroundColor: '#1c1c1e' }]}>
                <Text style={styles.liveStatNum}>{liveStats?.total || 0}</Text>
                <Text style={styles.liveStatLabel}>Total</Text>
              </View>
              <View style={[styles.liveStatPill, { backgroundColor: 'rgba(13, 148, 136, 0.15)' }]}>
                <Text style={[styles.liveStatNum, { color: '#0d9488' }]}>{liveStats?.available || 0}</Text>
                <Text style={styles.liveStatLabel}>Available</Text>
              </View>
              <View style={[styles.liveStatPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Text style={[styles.liveStatNum, { color: '#ef4444' }]}>{liveStats?.occupied || 0}</Text>
                <Text style={styles.liveStatLabel}>Occupied</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Real-Time Seat Grid</Text>
            <Text style={styles.subHelpText}>Tap any occupied seat to view student details</Text>

            <View style={styles.seatGrid}>
              {liveSeats.map((seat) => {
                const isOccupied = seat.status === 'occupied';
                const isBlocked = seat.status === 'blocked';

                return (
                  <TouchableOpacity
                    key={seat.id}
                    style={[
                      styles.adminSeatCell,
                      isOccupied && styles.adminSeatOccupied,
                      isBlocked && styles.adminSeatBlocked,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (seat.occupant) {
                        setSelectedOccupant({ ...seat.occupant, seatNumber: seat.seatNumber, roomName: seat.roomName });
                        setOccupantModalVisible(true);
                      } else {
                        Alert.alert(`Seat ${seat.seatNumber}`, `Status: ${seat.status.toUpperCase()}\nRoom: ${seat.roomName}`);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.adminSeatText,
                        isOccupied && styles.adminSeatTextOccupied,
                        isBlocked && styles.adminSeatTextBlocked,
                      ]}
                    >
                      {seat.seatNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        );

      // 5. STUDENTS DIRECTORY TAB
      case 'Students':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.searchBarContainer}>
              <Ionicons name="search-outline" size={18} color="#8e8e93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students by name, email, phone..."
                placeholderTextColor="#8e8e93"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#8e8e93" />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatListContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
              renderItem={({ item }) => (
                <View style={styles.studentCard}>
                  <View style={styles.studentCardTop}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>{item.name?.charAt(0).toUpperCase() || 'S'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{item.name}</Text>
                      <Text style={styles.studentEmail}>{item.email}</Text>
                      {item.phone && <Text style={styles.studentPhone}>📞 {item.phone}</Text>}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteStudentBtn}
                      onPress={() => handleDeleteStudent(item.id, item.name)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.studentMetaRow}>
                    <View>
                      <Text style={styles.detailLabel}>COLLEGE / COURSE</Text>
                      <Text style={styles.detailValue}>
                        {item.college || 'N/A'} • {item.course || 'N/A'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.detailLabel}>TOTAL BOOKINGS</Text>
                      <Text style={[styles.detailValue, { color: '#0d9488', fontWeight: '700' }]}>
                        {item.totalBookings} Bookings
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No students found</Text>}
            />
          </View>
        );

      // 6. LOGS TAB
      case 'Logs':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              <TouchableOpacity
                style={[styles.subTabBtn, logsSubTab === 'Attendance' && styles.subTabBtnActive]}
                onPress={() => setLogsSubTab('Attendance')}
              >
                <Text style={[styles.subTabBtnText, logsSubTab === 'Attendance' && styles.subTabBtnTextActive]}>
                  Attendance Logs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, logsSubTab === 'Payments' && styles.subTabBtnActive]}
                onPress={() => setLogsSubTab('Payments')}
              >
                <Text style={[styles.subTabBtnText, logsSubTab === 'Payments' && styles.subTabBtnTextActive]}>
                  Payment Transactions
                </Text>
              </TouchableOpacity>
            </View>

            {logsSubTab === 'Attendance' ? (
              <FlatList
                data={attendanceLogs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flatListContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
                renderItem={({ item }) => (
                  <View style={styles.logCard}>
                    <View style={styles.logCardHeader}>
                      <View>
                        <Text style={styles.logStudentName}>{item.studentName}</Text>
                        <Text style={styles.logBranch}>{item.branch}</Text>
                      </View>
                      <View style={[styles.statusPill, item.status === 'Active' ? styles.statusPending : styles.statusApproved]}>
                        <Text style={styles.statusPillText}>{item.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.logTimesRow}>
                      <Text style={styles.logTimeText}>In: {item.checkIn}</Text>
                      <Text style={styles.logTimeText}>Out: {item.checkOut}</Text>
                      <Text style={[styles.logTimeText, { color: '#0d9488', fontWeight: '700' }]}>{item.duration}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No attendance records found</Text>}
              />
            ) : (
              <FlatList
                data={paymentLogs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flatListContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
                renderItem={({ item }) => (
                  <View style={styles.logCard}>
                    <View style={styles.logCardHeader}>
                      <View>
                        <Text style={styles.logStudentName}>{item.studentName}</Text>
                        <Text style={styles.logBranch}>Tx: {item.transactionId}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.paymentAmount}>₹{item.amount}</Text>
                        <Text style={styles.paymentPlan}>{item.plan} Plan</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.logTimesRow}>
                      <Text style={styles.logTimeText}>{item.date}</Text>
                      <Text style={styles.logTimeText}>Via: {item.method?.toUpperCase() || 'RAZORPAY'}</Text>
                      <View style={[styles.statusPill, item.status === 'success' ? styles.statusApproved : styles.statusPending]}>
                        <Text style={styles.statusPillText}>{item.status?.toUpperCase() || 'SUCCESS'}</Text>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No payment records found</Text>}
              />
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
          <Text style={styles.headerTitle}>Sameer Library Admin</Text>
        </View>
        <TouchableOpacity style={styles.logoutIconBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Main Tab Area */}
      <View style={styles.contentArea}>{renderTabContent()}</View>

      {/* Bottom Navigation Tab Bar (6 Core Tabs) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Overview' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Overview')}
        >
          <Ionicons name={activeTab === 'Overview' ? 'grid' : 'grid-outline'} size={18} color={activeTab === 'Overview' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Overview' && styles.tabButtonTextActive]}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Bookings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Bookings')}
        >
          <Ionicons name={activeTab === 'Bookings' ? 'file-tray-full' : 'file-tray-full-outline'} size={18} color={activeTab === 'Bookings' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Bookings' && styles.tabButtonTextActive]}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Facilities' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('Facilities');
            setFacilityLevel('branches');
          }}
        >
          <Ionicons name={activeTab === 'Facilities' ? 'business' : 'business-outline'} size={18} color={activeTab === 'Facilities' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Facilities' && styles.tabButtonTextActive]}>Facilities</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Live' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Live')}
        >
          <Ionicons name={activeTab === 'Live' ? 'easel' : 'easel-outline'} size={18} color={activeTab === 'Live' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Live' && styles.tabButtonTextActive]}>Live</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Students' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Students')}
        >
          <Ionicons name={activeTab === 'Students' ? 'people' : 'people-outline'} size={18} color={activeTab === 'Students' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Students' && styles.tabButtonTextActive]}>Students</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Logs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Logs')}
        >
          <Ionicons name={activeTab === 'Logs' ? 'receipt' : 'receipt-outline'} size={18} color={activeTab === 'Logs' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Logs' && styles.tabButtonTextActive]}>Logs</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Create or Edit Branch */}
      <Modal visible={branchModalVisible} animationType="slide" transparent={true} onRequestClose={() => setBranchModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setBranchModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBranchId ? 'Edit Branch' : 'Add New Branch'}</Text>
              <TouchableOpacity onPress={() => setBranchModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalInputLabel}>BRANCH NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Sameer Library - Gomti Nagar"
                placeholderTextColor="#8e8e93"
                value={branchName}
                onChangeText={setBranchName}
              />
              
              {!editingBranchId && (
                <>
                  <Text style={styles.modalInputLabel}>BRANCH CODE</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. SL02"
                    placeholderTextColor="#8e8e93"
                    value={branchCode}
                    onChangeText={setBranchCode}
                    autoCapitalize="characters"
                  />
                </>
              )}

              <Text style={styles.modalInputLabel}>ADDRESS & CITY</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Address line"
                placeholderTextColor="#8e8e93"
                value={branchAddress}
                onChangeText={setBranchAddress}
              />
              <TextInput
                style={[styles.modalInput, { marginTop: 8 }]}
                placeholder="City (e.g. Lucknow)"
                placeholderTextColor="#8e8e93"
                value={branchCity}
                onChangeText={setBranchCity}
              />

              <Text style={styles.modalInputLabel}>CHOOSE COVER PHOTO PRESET</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {PHOTO_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetCard, branchPhoto === preset.url && styles.presetCardActive]}
                    onPress={() => setBranchPhoto(preset.url)}
                  >
                    <Image source={{ uri: preset.url }} style={styles.presetImage} />
                    <Text style={styles.presetText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveBranch}>
              <Text style={styles.modalSubmitBtnText}>{editingBranchId ? 'Save Changes' : 'Create Branch'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Create or Edit Room */}
      <Modal visible={roomModalVisible} animationType="slide" transparent={true} onRequestClose={() => setRoomModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRoomModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoomId ? `Edit Room` : `Add Room to ${selectedBranch?.name}`}
              </Text>
              <TouchableOpacity onPress={() => setRoomModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalInputLabel}>ROOM NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Silent Study Zone, Discussion Hall"
                placeholderTextColor="#8e8e93"
                value={roomName}
                onChangeText={setRoomName}
              />

              <Text style={styles.modalInputLabel}>CAPACITY (SEATS)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 20"
                placeholderTextColor="#8e8e93"
                keyboardType="numeric"
                value={roomCapacity}
                onChangeText={setRoomCapacity}
              />

              <Text style={styles.modalInputLabel}>CHOOSE ROOM PHOTO PRESET</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {PHOTO_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetCard, roomPhoto === preset.url && styles.presetCardActive]}
                    onPress={() => setRoomPhoto(preset.url)}
                  >
                    <Image source={{ uri: preset.url }} style={styles.presetImage} />
                    <Text style={styles.presetText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveRoom}>
              <Text style={styles.modalSubmitBtnText}>{editingRoomId ? 'Save Changes' : 'Add Room'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Add Seats (Batch Generation) */}
      <Modal visible={addSeatModal} animationType="slide" transparent={true} onRequestClose={() => setAddSeatModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAddSeatModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Seats for {selectedRoom?.name}</Text>
              <TouchableOpacity onPress={() => setAddSeatModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalInputLabel}>NUMBER OF SEATS TO ADD</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 5, 10, 20"
              placeholderTextColor="#8e8e93"
              keyboardType="numeric"
              value={newSeatCount}
              onChangeText={setNewSeatCount}
            />
            <Text style={[styles.subHelpText, { marginTop: 8 }]}>
              Seats will be sequentially numbered automatically (e.g. S1, S2, S3...)
            </Text>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddSeats}>
              <Text style={styles.modalSubmitBtnText}>Generate Seats</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Occupant Detail Sheet Modal */}
      <Modal visible={occupantModalVisible} animationType="slide" transparent={true} onRequestClose={() => setOccupantModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOccupantModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seat Occupant Details</Text>
              <TouchableOpacity onPress={() => setOccupantModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            {selectedOccupant && (
              <View style={{ gap: 12, marginVertical: 12 }}>
                <View style={styles.occupantRow}>
                  <Text style={styles.detailLabel}>SEAT & ROOM</Text>
                  <Text style={[styles.detailValue, { color: '#0d9488', fontWeight: '700' }]}>
                    Seat {selectedOccupant.seatNumber} ({selectedOccupant.roomName})
                  </Text>
                </View>
                <View style={styles.occupantRow}>
                  <Text style={styles.detailLabel}>STUDENT NAME</Text>
                  <Text style={styles.detailValue}>{selectedOccupant.name}</Text>
                </View>
                <View style={styles.occupantRow}>
                  <Text style={styles.detailLabel}>EMAIL</Text>
                  <Text style={styles.detailValue}>{selectedOccupant.email}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setOccupantModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
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
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8e8e93',
    marginTop: 12,
    fontSize: 13,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1c1c1e',
    backgroundColor: '#000000',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderColor: '#0d9488',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  adminBadgeText: {
    color: '#0d9488',
    fontSize: 10,
    fontWeight: '800',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  logoutIconBtn: {
    padding: 6,
  },
  contentArea: {
    flex: 1,
  },
  tabScroll: {
    padding: 16,
    paddingBottom: 30,
  },
  flatListContent: {
    padding: 16,
    paddingBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
    borderRadius: 14,
    padding: 14,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '700',
  },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  statSubText: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  subHelpText: {
    color: '#8e8e93',
    fontSize: 12,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  occupancyItem: {
    marginBottom: 12,
  },
  occupancyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  occupancyRoomName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  occupancyCount: {
    color: '#8e8e93',
    fontSize: 11,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#26262a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0d9488',
    borderRadius: 3,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#26262a',
    gap: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityEvent: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  activityTime: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 2,
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
  },
  filterBtnActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  filterBtnText: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '700',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  bookingItemCard: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  bookingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingStudentInfo: {
    flex: 1,
    marginRight: 8,
  },
  bookingStudentName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  bookingStudentEmail: {
    color: '#8e8e93',
    fontSize: 11,
    marginTop: 2,
  },
  bookingStudentPhone: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    height: 0.5,
    backgroundColor: '#26262a',
    marginVertical: 10,
  },
  bookingDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#26262a',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0d9488',
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Facilities Styles
  facilityNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#26262a',
    backgroundColor: '#000000',
  },
  backLevelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLevelText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  facilityLevelTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  addLevelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d9488',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  addLevelBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  facilityCard: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  facilityImage: {
    width: '100%',
    height: 125,
    backgroundColor: '#26262a',
  },
  facilityImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityCardBody: {
    padding: 14,
  },
  facilityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  facilityCardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  facilityCardSub: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  facilityActionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  editIconBtn: {
    padding: 6,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0d9488',
  },
  deleteIconBtn: {
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  facilityCardStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  facilityStatPill: {
    color: '#e5e5ea',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#26262a',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  managePillBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  managePillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  // Seat Management Grid
  seatManageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  seatManageCard: {
    width: (width - 42) / 2,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  seatManageCardBlocked: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  seatManageCardBooked: {
    borderColor: '#f59e0b',
  },
  seatManageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seatManageNum: {
    color: '#0d9488',
    fontSize: 18,
    fontWeight: '800',
  },
  seatManageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  seatLockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 6,
    borderRadius: 6,
  },
  seatLockBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  seatUnlockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 6,
    borderRadius: 6,
  },
  seatUnlockBtnText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '700',
  },
  seatDeleteBtn: {
    padding: 6,
    backgroundColor: '#26262a',
    borderRadius: 6,
  },
  liveStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  liveStatPill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#26262a',
    paddingVertical: 10,
    alignItems: 'center',
  },
  liveStatNum: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  liveStatLabel: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 2,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  adminSeatCell: {
    width: (width - 64) / 5,
    height: 40,
    borderColor: '#0d9488',
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  adminSeatOccupied: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  adminSeatBlocked: {
    backgroundColor: '#26262a',
    borderColor: '#525252',
  },
  adminSeatText: {
    color: '#0d9488',
    fontSize: 12,
    fontWeight: '700',
  },
  adminSeatTextOccupied: {
    color: '#ffffff',
  },
  adminSeatTextBlocked: {
    color: '#8e8e93',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    height: 40,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  studentCard: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  studentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  studentName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  studentEmail: {
    color: '#8e8e93',
    fontSize: 11,
    marginTop: 1,
  },
  studentPhone: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 1,
  },
  deleteStudentBtn: {
    padding: 6,
  },
  studentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
  },
  subTabBtnActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  subTabBtnText: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '700',
  },
  subTabBtnTextActive: {
    color: '#ffffff',
  },
  logCard: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logStudentName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  logBranch: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 2,
  },
  logTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTimeText: {
    color: '#e5e5ea',
    fontSize: 11,
  },
  paymentAmount: {
    color: '#0d9488',
    fontSize: 15,
    fontWeight: '800',
  },
  paymentPlan: {
    color: '#8e8e93',
    fontSize: 9,
    marginTop: 1,
  },
  tabBar: {
    height: 60,
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#1c1c1e',
    backgroundColor: '#000000',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabButtonActive: {},
  tabButtonText: {
    color: '#8e8e93',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  tabButtonTextActive: {
    color: '#0d9488',
  },
  // Modal Styling
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#26262a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#26262a',
    paddingBottom: 12,
    marginBottom: 14,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalInputLabel: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#26262a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  presetCard: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#26262a',
    width: 92,
  },
  presetCardActive: {
    borderColor: '#0d9488',
    borderWidth: 2,
  },
  presetImage: {
    width: '100%',
    height: 52,
    backgroundColor: '#26262a',
  },
  presetText: {
    color: '#ffffff',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#1c1c1e',
  },
  modalSubmitBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  occupantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalCloseBtn: {
    backgroundColor: '#1c1c1e',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AdminDashboard;
