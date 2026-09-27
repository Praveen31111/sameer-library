import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../services/api';

const { width } = Dimensions.get('window');

interface ParsedStudentRow {
  id: string;
  name: string;
  phone: string;
  email?: string;
  seatNumber?: string;
  shift?: string;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  college?: string;
  isValid: boolean;
  error?: string;
}

interface BulkStudentImportModalProps {
  visible: boolean;
  onClose: () => void;
  branches: any[];
  onImportSuccess?: () => void;
}

const SAMPLE_CSV_DATA = `Name,Phone,Email,Seat,Shift,TotalFee,PaidAmount,DueAmount,College
Rahul Kumar,9876543210,rahul.kumar@gmail.com,A1,FULL_DAY,1000,1000,0,Science College
Priya Sharma,9811223344,priya.sharma@gmail.com,B4,MORNING,1000,800,200,Patna University
Amit Singh,9899001122,amit.upsc@gmail.com,C2,EVENING,1000,500,500,AN College
Sneha Verma,9700112233,sneha.verma@gmail.com,A5,FULL_DAY,1000,1000,0,Women's College
Vikram Yadav,9655443322,vikram.yadav@gmail.com,B1,FULL_DAY,1000,0,1000,Commerce College`;

export const BulkStudentImportModal: React.FC<BulkStudentImportModalProps> = ({
  visible,
  onClose,
  branches,
  onImportSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [activeStep, setActiveStep] = useState<'INPUT' | 'PREVIEW' | 'SUCCESS'>('INPUT');
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [defaultPassword, setDefaultPassword] = useState('Sameer@123');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Sync selected branch if branches change
  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches]);

  // Download / Share Sample Template
  const handleDownloadTemplate = async () => {
    try {
      await Share.share({
        title: 'Sameer Library - Bulk Student Import Template',
        message: `Sameer Library Bulk Student Template (CSV):\n\n${SAMPLE_CSV_DATA}\n\nTip: You can copy this data, open in Excel, add your students, and paste back into the portal. Students can later login using their Gmail ID to view their full details!`,
      });
    } catch (e) {
      Alert.alert('Template Data', SAMPLE_CSV_DATA);
    }
  };

  // Smart Parser for CSV, TSV (Excel paste), and Pipe delimited data
  const handleParseData = () => {
    const raw = pasteText.trim();
    if (!raw) {
      Alert.alert('Data Missing', 'Kripya Excel ya CSV se students ka data box me paste karein.');
      return;
    }

    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: ParsedStudentRow[] = [];

    // Check if line 1 is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes('name') ||
      firstLineLower.includes('phone') ||
      firstLineLower.includes('email') ||
      firstLineLower.includes('mobile') ||
      firstLineLower.includes('seat');

    const dataLines = hasHeader ? lines.slice(1) : lines;

    if (dataLines.length === 0) {
      Alert.alert('Empty Data', 'Kripya kam se kam ek student ka data enter karein.');
      return;
    }

    dataLines.forEach((line, index) => {
      // Auto-detect delimiter: Tab (from Excel copy), Comma (CSV), or Pipe (|)
      let delimiter = ',';
      if (line.includes('\t')) delimiter = '\t';
      else if (line.includes('|')) delimiter = '|';
      else if (line.includes(';') && !line.includes(',')) delimiter = ';';

      const parts = line.split(delimiter).map((p) => p.trim());
      const name = parts[0] || '';
      let rawPhone = parts[1] || '';

      // Normalize phone number (strip spaces, dashes, +91, 0)
      let cleanPhone = rawPhone.replace(/\D/g, '');
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
      else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);

      // Smart Email / Gmail ID detection
      let detectedEmail: string | undefined = undefined;
      let seatIdx = 2;

      if (parts[2] && parts[2].includes('@')) {
        detectedEmail = parts[2].toLowerCase().trim();
        seatIdx = 3;
      } else {
        // Also check any other column for an email address
        for (let c = 1; c < parts.length; c++) {
          if (parts[c].includes('@') && parts[c].includes('.')) {
            detectedEmail = parts[c].toLowerCase().trim();
            break;
          }
        }
      }

      const seatNumber = parts[seatIdx] ? parts[seatIdx].toUpperCase() : undefined;
      const rawShift = parts[seatIdx + 1] ? parts[seatIdx + 1].toUpperCase() : 'FULL_DAY';
      const shift =
        rawShift.includes('MORN') ? 'MORNING' : rawShift.includes('EVEN') ? 'EVENING' : 'FULL_DAY';

      const totalFee = parts[seatIdx + 2] ? Number(parts[seatIdx + 2]) || 1000 : 1000;
      const paidAmount = parts[seatIdx + 3] ? Number(parts[seatIdx + 3]) || 0 : totalFee;
      const dueAmount =
        parts[seatIdx + 4] !== undefined && parts[seatIdx + 4] !== ''
          ? Number(parts[seatIdx + 4]) || 0
          : Math.max(0, totalFee - paidAmount);
      const college = parts[seatIdx + 5] || undefined;

      const isValidName = name.length >= 2;
      const isValidPhone = cleanPhone.length === 10;
      const isValid = isValidName && isValidPhone;

      let error = '';
      if (!isValidName) error = 'Invalid Name';
      else if (!isValidPhone) error = `Invalid Phone: "${rawPhone}"`;

      parsed.push({
        id: `row-${index}-${Date.now()}`,
        name,
        phone: cleanPhone || rawPhone,
        email: detectedEmail,
        seatNumber,
        shift,
        totalFee,
        paidAmount,
        dueAmount,
        college,
        isValid,
        error,
      });
    });

    setParsedRows(parsed);
    setActiveStep('PREVIEW');
  };

  // Remove row from preview
  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Submit Bulk Import to Backend API
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      Alert.alert('No Valid Records', 'Import karne ke liye kam se kam 1 valid student hona zaruri hai.');
      return;
    }

    try {
      setImporting(true);
      const res = await apiRequest('/admin/students/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          students: validRows.map((r) => ({
            name: r.name,
            phone: r.phone,
            email: r.email,
            seatNumber: r.seatNumber,
            shift: r.shift,
            totalFee: r.totalFee,
            paidAmount: r.paidAmount,
            dueAmount: r.dueAmount,
            college: r.college,
          })),
          defaultBranchId: selectedBranchId,
          defaultPassword: defaultPassword.trim() || 'Sameer@123',
        }),
      });

      if (res?.success) {
        setImportResult(res);
        setActiveStep('SUCCESS');
        onImportSuccess?.();
      } else {
        Alert.alert('Import Warning', res?.error || 'Bulk import complete nahi ho saka.');
      }
    } catch (e: any) {
      console.error('Bulk import submission error:', e);
      Alert.alert('Error', e?.message || 'Server error occurred during import.');
    } finally {
      setImporting(false);
    }
  };

  // Share Welcome Message
  const handleShareWelcome = async () => {
    if (!importResult?.sampleWelcomeMessage) return;
    try {
      await Share.share({
        title: 'Sameer Digital Library - Welcome Message',
        message: importResult.sampleWelcomeMessage,
      });
    } catch (e) {}
  };

  const handleReset = () => {
    setActiveStep('INPUT');
    setPasteText('');
    setParsedRows([]);
    setImportResult(null);
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleReset}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="people" size={20} color="#4f46e5" />
                </View>
                <Text style={styles.modalTitle}>Bulk Student Onboarding</Text>
              </View>
              <Text style={styles.modalSub}>
                Existing library students ko Excel/CSV se ek click me add karein
              </Text>
            </View>
            <TouchableOpacity onPress={handleReset} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Step 1: Input Data */}
          {activeStep === 'INPUT' && (
            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {/* Template Banner */}
              <View style={styles.templateCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.templateTitle}>Excel / CSV Sample Format</Text>
                  <Text style={styles.templateSub}>
                    Columns: Name, Phone, Seat, Shift, Fee, Paid, Due
                  </Text>
                </View>
                <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadTemplate}>
                  <Ionicons name="download-outline" size={16} color="#4f46e5" />
                  <Text style={styles.downloadBtnText}>Template</Text>
                </TouchableOpacity>
              </View>

              {/* Branch Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Branch *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 8 }}>
                  {branches.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.branchSelectChip,
                        selectedBranchId === b.id && styles.branchSelectChipActive,
                      ]}
                      onPress={() => setSelectedBranchId(b.id)}
                    >
                      <Ionicons
                        name="business"
                        size={14}
                        color={selectedBranchId === b.id ? '#ffffff' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.branchSelectText,
                          selectedBranchId === b.id && styles.branchSelectTextActive,
                        ]}
                      >
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Paste Box */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.inputLabel}>Paste Excel Rows or CSV Data *</Text>
                  <TouchableOpacity
                    onPress={() => setPasteText(SAMPLE_CSV_DATA)}
                    style={{ paddingVertical: 2, paddingHorizontal: 6 }}
                  >
                    <Text style={{ fontSize: 11, color: '#4f46e5', fontWeight: '600' }}>
                      + Load Demo 5 Rows
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={8}
                  placeholder={`Rahul Kumar, 9876543210, rahul.kumar@gmail.com, A1, FULL_DAY, 1000, 1000, 0\nPriya Sharma, 9811223344, priya@gmail.com, B4, MORNING, 1000, 800, 200\nAmit Singh, 9899001122, amit@gmail.com, C2, EVENING, 1000, 500, 500`}
                  placeholderTextColor="#64748b"
                  value={pasteText}
                  onChangeText={setPasteText}
                />
                <Text style={styles.inputHelper}>
                  💡 Student ka Gmail ID dalenge to wo app me direct "Sign in with Google" se login karke apna pura detail (seat, fee due, pass) dekh sakega.
                </Text>
              </View>

              {/* Default Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Default Student Login Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={defaultPassword}
                  onChangeText={setDefaultPassword}
                  placeholder="e.g. Sameer@123"
                  placeholderTextColor="#64748b"
                />
                <Text style={styles.inputHelper}>
                  Student app me apna mobile number aur ye password daal kar login kar payenge.
                </Text>
              </View>

              {/* Parse Button */}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleParseData}>
                <Ionicons name="flash" size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Review & Validate Data</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Step 2: Preview & Validation Grid */}
          {activeStep === 'PREVIEW' && (
            <View style={{ flex: 1 }}>
              {/* Counters Header */}
              <View style={styles.previewStatsRow}>
                <View style={[styles.statBox, { borderColor: '#10b981', backgroundColor: '#064e3b20' }]}>
                  <Text style={[styles.statNum, { color: '#10b981' }]}>{validCount}</Text>
                  <Text style={styles.statLabel}>Ready to Import</Text>
                </View>
                {errorCount > 0 && (
                  <View style={[styles.statBox, { borderColor: '#ef4444', backgroundColor: '#7f1d1d20' }]}>
                    <Text style={[styles.statNum, { color: '#ef4444' }]}>{errorCount}</Text>
                    <Text style={styles.statLabel}>Invalid / Error</Text>
                  </View>
                )}
                <View style={[styles.statBox, { borderColor: '#6366f1', backgroundColor: '#312e8120' }]}>
                  <Text style={[styles.statNum, { color: '#818cf8' }]}>{parsedRows.length}</Text>
                  <Text style={styles.statLabel}>Total Detected</Text>
                </View>
              </View>

              {/* Student Rows List */}
              <ScrollView style={{ maxHeight: 360, marginTop: 8 }} showsVerticalScrollIndicator={false}>
                {parsedRows.map((row, idx) => (
                  <View
                    key={row.id}
                    style={[
                      styles.rowCard,
                      !row.isValid && { borderColor: '#ef4444', backgroundColor: '#ef444408' },
                    ]}
                  >
                    <View style={styles.rowAvatarCircle}>
                      <Text style={styles.rowAvatarText}>
                        {row.name ? row.name.slice(0, 1).toUpperCase() : '?'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {row.name || 'Unnamed Student'}
                        </Text>
                        <TouchableOpacity onPress={() => handleRemoveRow(row.id)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        <Text style={[styles.rowPhone, !row.isValid && { color: '#ef4444' }]}>
                          📞 {row.phone}
                        </Text>
                        {row.email ? (
                          <View style={styles.gmailPill}>
                            <Ionicons name="mail" size={11} color="#38bdf8" />
                            <Text style={styles.gmailPillText} numberOfLines={1}>{row.email}</Text>
                          </View>
                        ) : (
                          <View style={[styles.gmailPill, { backgroundColor: '#33415525', borderColor: '#47556940' }]}>
                            <Text style={[styles.gmailPillText, { color: '#94a3b8' }]}>✉️ Auto ID</Text>
                          </View>
                        )}
                        {row.seatNumber && (
                          <View style={styles.seatPill}>
                            <Text style={styles.seatPillText}>🪑 Seat {row.seatNumber}</Text>
                          </View>
                        )}
                        <View style={styles.shiftPill}>
                          <Text style={styles.shiftPillText}>{row.shift}</Text>
                        </View>
                      </View>

                      {/* Financial info */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={styles.feeText}>Fee: ₹{row.totalFee}</Text>
                        <Text style={styles.feeText}>Paid: ₹{row.paidAmount}</Text>
                        {row.dueAmount > 0 ? (
                          <Text style={[styles.feeText, { color: '#f59e0b', fontWeight: '700' }]}>
                            Due: ₹{row.dueAmount}
                          </Text>
                        ) : (
                          <Text style={[styles.feeText, { color: '#10b981' }]}>PAID</Text>
                        )}
                      </View>

                      {row.error && <Text style={styles.rowErrorText}>⚠️ {row.error}</Text>}
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.previewActionRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setActiveStep('INPUT')}
                  disabled={importing}
                >
                  <Ionicons name="arrow-back" size={16} color="#94a3b8" />
                  <Text style={styles.secondaryBtnText}>Edit Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
                  onPress={handleConfirmImport}
                  disabled={importing || validCount === 0}
                >
                  {importing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={18} color="#ffffff" />
                      <Text style={styles.primaryBtnText}>
                        Confirm & Import {validCount} Students
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3: Success Screen */}
          {activeStep === 'SUCCESS' && importResult && (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-done" size={42} color="#10b981" />
              </View>
              <Text style={styles.successTitle}>Onboarding Successful!</Text>
              <Text style={styles.successSub}>
                {importResult.importedCount} new students added, {importResult.updatedCount} updated.
              </Text>

              {/* Summary Badges */}
              <View style={styles.successSummaryBox}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNum}>{importResult.importedCount + importResult.updatedCount}</Text>
                  <Text style={styles.summaryLabel}>Accounts Active</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNum}>{importResult.importedStudents?.length || 0}</Text>
                  <Text style={styles.summaryLabel}>Seats Allocated</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNum}>{importResult.failedCount || 0}</Text>
                  <Text style={styles.summaryLabel}>Failed</Text>
                </View>
              </View>

              {/* WhatsApp Broadcast Card */}
              <View style={styles.whatsappCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  <Text style={styles.whatsappTitle}>Student App Welcome Message</Text>
                </View>
                <Text style={styles.whatsappText} numberOfLines={4}>
                  {importResult.sampleWelcomeMessage}
                </Text>
                <TouchableOpacity style={styles.whatsappBtn} onPress={handleShareWelcome}>
                  <Ionicons name="share-social-outline" size={16} color="#ffffff" />
                  <Text style={styles.whatsappBtnText}>Share / Broadcast to WhatsApp</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 12 }]} onPress={handleReset}>
                <Text style={styles.primaryBtnText}>Done & Refresh Facilities</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 14,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4f46e520',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  modalSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b80',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  templateSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4f46e520',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#818cf8',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  branchSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  branchSelectChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  branchSelectText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  branchSelectTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#f8fafc',
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  textInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#f8fafc',
  },
  inputHelper: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryBtnText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  previewStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e293b50',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  rowAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f620',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60a5fa',
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  rowPhone: {
    fontSize: 12,
    color: '#94a3b8',
  },
  gmailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284c718',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284c735',
    maxWidth: 190,
  },
  gmailPillText: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: '600',
  },
  seatPill: {
    backgroundColor: '#0d948820',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0d948840',
  },
  seatPillText: {
    fontSize: 10,
    color: '#2dd4bf',
    fontWeight: '600',
  },
  shiftPill: {
    backgroundColor: '#6366f120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shiftPillText: {
    fontSize: 10,
    color: '#a5b4fc',
    fontWeight: '500',
  },
  feeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  rowErrorText: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 3,
  },
  previewActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10b98120',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  successSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  successSummaryBox: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 14,
    width: '100%',
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  whatsappCard: {
    width: '100%',
    backgroundColor: '#022c2220',
    borderWidth: 1,
    borderColor: '#05966950',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  whatsappTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34d399',
  },
  whatsappText: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 10,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 8,
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
