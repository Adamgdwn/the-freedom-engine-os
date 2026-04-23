import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f5f2" },
  mobileShell: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  mobileBannerStack: { gap: 8 },
  mobileTopBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "rgba(255, 250, 243, 0.84)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.08)"
  },
  mobileIdentity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  mobileIdentityMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#172225",
    alignItems: "center",
    justifyContent: "center"
  },
  mobileIdentityMarkLabel: { color: "#f8fbff", fontWeight: "800", fontSize: 22 },
  mobileIdentityCopy: { flex: 1, minWidth: 0, gap: 4 },
  mobileIdentityEyebrow: { color: "#0f766e", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  mobileIdentityTitle: { color: "#172225", fontSize: 22, lineHeight: 24, fontWeight: "800" },
  mobileIdentitySubtitle: { color: "#556367", fontSize: 12, lineHeight: 17 },
  mobileQuickActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  mobileQuickAction: {
    minWidth: 54,
    height: 46,
    borderRadius: 15,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.08)"
  },
  mobileQuickActionActive: {
    backgroundColor: "#172225",
    borderColor: "#172225"
  },
  mobileQuickActionLabel: { color: "#172225", fontSize: 20, fontWeight: "800" },
  mobileQuickActionText: { color: "#172225", fontSize: 13, fontWeight: "800" },
  mobileQuickActionTextActive: { color: "#fff8ef" },
  mobileStatusStrip: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mobileViewport: { flex: 1, minHeight: 0 },
  mobileVoiceDock: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0
  },
  mobileVoiceButton: {
    backgroundColor: "#0f766e",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#115e59",
    shadowColor: "#172225",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  mobileVoiceButtonCopy: { flex: 1, gap: 2 },
  mobileVoiceButtonEyebrow: {
    color: "rgba(232, 244, 243, 0.76)",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontSize: 11,
    fontWeight: "800"
  },
  mobileVoiceButtonTitle: { color: "#ffffff", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  mobileVoiceButtonHint: { color: "rgba(232, 244, 243, 0.82)", fontSize: 12, lineHeight: 17 },
  mobileVoiceButtonGlyph: { color: "#ffffff", fontSize: 20, fontWeight: "800" },
  mobileSheetOverlay: { flex: 1, justifyContent: "flex-end" },
  mobileSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(23, 34, 37, 0.28)"
  },
  mobileSheet: {
    backgroundColor: "#fff8ef",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "82%"
  },
  mobileSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(23, 34, 37, 0.18)",
    marginBottom: 12
  },
  mobileSheetHeader: { gap: 4, marginBottom: 14 },
  mobileSheetEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  mobileSheetEyebrow: {
    color: "#0f766e",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: "800"
  },
  mobileSheetTitle: { color: "#172225", fontSize: 24, lineHeight: 28, fontWeight: "800" },
  mobileSheetConnectionMark: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: "800",
    minWidth: 12,
    textAlign: "center"
  },
  mobileSheetConnectionMarkConnected: { color: "#16a34a" },
  mobileSheetConnectionMarkDisconnected: { color: "#172225" },
  mobileSheetSubtitle: { color: "#556367", fontSize: 13, lineHeight: 18 },
  mobileSheetScroll: { gap: 16, paddingBottom: 12 },
  mobileSheetSection: { gap: 10 },
  mobileSheetSectionTitle: { color: "#172225", fontSize: 15, fontWeight: "800" },
  mobileSheetNavButton: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.08)"
  },
  mobileSheetNavButtonActive: {
    backgroundColor: "#172225",
    borderColor: "#172225"
  },
  mobileSheetNavLabel: { color: "#172225", fontSize: 15, fontWeight: "800" },
  mobileSheetNavLabelActive: { color: "#fff8ef" },
  mobileSheetNavMeta: { color: "#556367", fontSize: 12, lineHeight: 17 },
  mobileSheetNavMetaActive: { color: "rgba(255, 248, 239, 0.76)" },
  mobileSheetActionRow: { gap: 10 },
  mobileSheetActionButton: { width: "100%" },
  mobileSheetHelper: { color: "#556367", fontSize: 12, lineHeight: 18 },
  mobileSheetTaskCard: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.08)"
  },
  mobileSheetTaskTitle: { color: "#172225", fontSize: 16, lineHeight: 20, fontWeight: "800" },
  mobileSheetInfoCard: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.08)"
  },
  mobileSheetInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  mobileSheetInfoLabel: { color: "#556367", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  mobileSheetInfoValue: { color: "#172225", fontSize: 14, lineHeight: 18, fontWeight: "800", flexShrink: 1, textAlign: "right" },
  mobileSheetDangerButton: { marginTop: 4, backgroundColor: "#fee2e2" },
  mobileDock: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(15, 32, 56, 0.94)",
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingTop: 10
  },
  mobileDockButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center"
  },
  mobileDockButtonActive: { backgroundColor: "#4da7d3" },
  mobileDockLabel: { color: "#c6d8ea", fontWeight: "800", fontSize: 15 },
  mobileDockLabelActive: { color: "#0c213a" },
  heroCard: {
    backgroundColor: "#172225",
    borderRadius: 12,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 248, 239, 0.12)",
    shadowColor: "#172225",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  assistantStageCard: {
    backgroundColor: "#fff8ef",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.08)"
  },
  startHeroCard: {
    backgroundColor: "#172225",
    borderRadius: 24,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(86, 211, 255, 0.18)"
  },
  startHeroBadgeRow: { gap: 8 },
  startHeroEyebrow: { color: "#99f6e4", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "800", fontSize: 11 },
  startHeroStatus: { color: "#9ab6d3", fontSize: 12, lineHeight: 18 },
  startHeroTitle: { color: "#ffffff", fontSize: 34, lineHeight: 36, fontWeight: "800" },
  startHeroBody: { color: "#cedcf0", fontSize: 15, lineHeight: 22 },
  startTileGrid: { gap: 10 },
  startTile: {
    backgroundColor: "rgba(255,250,243,0.94)",
    borderRadius: 18,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.08)"
  },
  startTilePrimary: {
    backgroundColor: "#e7f7f4",
    borderColor: "rgba(15,118,110,0.18)"
  },
  startTileEyebrow: { color: "#0f766e", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  startTileTitle: { color: "#172225", fontSize: 20, lineHeight: 24, fontWeight: "800" },
  startTileMeta: { color: "#556367", fontSize: 13, lineHeight: 19 },
  startThreadHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  startThreadCopy: { flex: 1, gap: 6 },
  startThreadTitle: { color: "#172225", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  startThreadAction: { flex: 1 },
  startRecentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(23,34,37,0.08)"
  },
  startRecentCopy: { flex: 1, gap: 4 },
  startRecentTitle: { color: "#172225", fontSize: 15, lineHeight: 19, fontWeight: "800" },
  startRecentMeta: { color: "#687c97", fontSize: 12, lineHeight: 18 },
  homebaseHeroCard: {
    backgroundColor: "#fff8ef",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(23,34,37,0.08)"
  },
  homebaseSummaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  homebaseSummaryTile: {
    flexGrow: 1,
    minWidth: "46%",
    backgroundColor: "#fffdf8",
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(23,34,37,0.06)"
  },
  homebaseSummaryValue: { color: "#172225", fontSize: 20, lineHeight: 22, fontWeight: "800" },
  homebaseSummaryLabel: { color: "#687c97", fontSize: 12, lineHeight: 16 },
  stageHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  stageEyebrow: {
    color: "#0f766e",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "800",
    fontSize: 12
  },
  stageBadge: {
    color: "#b45309",
    backgroundColor: "rgba(180, 83, 9, 0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
    fontWeight: "700",
    fontSize: 12
  },
  stageTitle: { color: "#172225", fontSize: 24, lineHeight: 28, fontWeight: "800" },
  stageBody: { color: "#556367", lineHeight: 21, fontSize: 14 },
  stageActionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  owlBadgeShell: {
    alignSelf: "center",
    width: 112,
    height: 132,
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 6
  },
  owlBadgeShellCompact: {
    width: 88,
    height: 104,
    marginBottom: 0
  },
  owlEarRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: -8,
    zIndex: 2
  },
  owlEar: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#dcecff",
    borderWidth: 1,
    borderColor: "rgba(76, 145, 206, 0.36)",
    transform: [{ rotate: "45deg" }]
  },
  owlHead: {
    width: 88,
    height: 66,
    borderRadius: 22,
    backgroundColor: "#dfeefe",
    borderWidth: 1,
    borderColor: "rgba(76, 145, 206, 0.34)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1
  },
  owlEyeCluster: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#173458",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  owlEye: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#8fd9ff",
    alignItems: "center",
    justifyContent: "center"
  },
  owlPupil: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff"
  },
  owlBeak: {
    marginTop: 8,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#6f90b8"
  },
  owlBody: {
    width: 58,
    height: 44,
    borderRadius: 18,
    marginTop: 8,
    backgroundColor: "#e8f2ff",
    borderWidth: 1,
    borderColor: "rgba(76, 145, 206, 0.3)",
    alignItems: "center",
    justifyContent: "center"
  },
  owlChest: {
    width: 26,
    height: 22,
    borderRadius: 10,
    backgroundColor: "#cddff4"
  },
  owlWingRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -26,
    paddingHorizontal: 8
  },
  owlWing: {
    width: 20,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#dcecff",
    borderWidth: 1,
    borderColor: "rgba(76, 145, 206, 0.26)"
  },
  shellHeaderCard: {
    backgroundColor: "rgba(246, 250, 255, 0.96)",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(20, 52, 92, 0.08)",
    shadowColor: "#0b1526",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    marginBottom: 10
  },
  shellHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  shellHeaderTopStacked: { flexDirection: "column", alignItems: "stretch" },
  shellBrandCluster: { flex: 1, minWidth: 0, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  shellBrandClusterStacked: { width: "100%" },
  shellBrandMark: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#12325b",
    alignItems: "center",
    justifyContent: "center"
  },
  shellBrandMarkLabel: { color: "#eff6ff", fontSize: 18, fontWeight: "800" },
  shellBrandCopy: { flex: 1, minWidth: 0, gap: 2 },
  shellBrandTitle: { fontSize: 24, lineHeight: 26, fontWeight: "800", color: "#10233e" },
  shellBrandTitleCompact: { fontSize: 22, lineHeight: 24 },
  shellBrandSubtitle: { color: "#5a6d87", fontSize: 13, lineHeight: 18 },
  shellHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  shellHeaderActionsStacked: { width: "100%", justifyContent: "flex-start" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  headerActions: { alignItems: "flex-end", gap: 8 },
  headerActionButton: { minWidth: 148 },
  headerMetaRow: { marginTop: 10, gap: 8 },
  headerMenuButton: { alignSelf: "flex-start", minHeight: 42, paddingVertical: 10, paddingHorizontal: 14 },
  headerStatusText: { color: "#475569", lineHeight: 20 },
  voiceStatusText: { fontSize: 12, fontWeight: "700" },
  voiceStatusReady: { color: "#0f766e" },
  voiceStatusWarning: { color: "#92400e" },
  chatAppHeader: {
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2
  },
  chatAppHeaderCopy: { flex: 1, minWidth: 0, gap: 2 },
  chatAppHeaderTitle: { fontSize: 23, lineHeight: 26, fontWeight: "800", color: "#0f172a" },
  chatAppHeaderSubtitle: { color: "#64748b", fontSize: 12, lineHeight: 16 },
  chatAppHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(18, 50, 91, 0.08)"
  },
  iconButtonWide: { minWidth: 88, flexGrow: 1 },
  iconButtonLabel: { color: "#10233e", fontWeight: "800", fontSize: 13 },
  warningIconButton: { backgroundColor: "#fff2d8" },
  topPanel: {
    backgroundColor: "rgba(244,248,255,0.92)",
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(18, 50, 91, 0.08)"
  },
  panelLead: { color: "#50647f", lineHeight: 18, fontSize: 12, fontWeight: "700" },
  eyebrow: { color: "#99f6e4", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "800", fontSize: 12 },
  heroTitle: { fontSize: 31, lineHeight: 34, fontWeight: "800", color: "#f8fafc" },
  brand: { fontSize: 31, lineHeight: 34, fontWeight: "800", color: "#10233e" },
  heroBody: { color: "#cedcf0", lineHeight: 22, fontSize: 15 },
  subtitle: { color: "#5a6d87", marginTop: 2, fontSize: 15 },
  nav: { flexDirection: "row", gap: 8 },
  navCompact: { flexWrap: "wrap" },
  topActions: { flexDirection: "row", gap: 8 },
  topActionsStacked: { flexDirection: "column" },
  navButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#dde7f5",
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(18, 50, 91, 0.04)"
  },
  navButtonCompact: { minWidth: "31%" },
  navButtonActive: { backgroundColor: "#14345d" },
  navLabel: { color: "#3d526d", fontWeight: "700" },
  navLabelActive: { color: "#ffffff" },
  content: { gap: 14, paddingBottom: 28, flexGrow: 1 },
  startContent: {
    flexGrow: 1,
    minHeight: "100%",
    paddingTop: 8,
    justifyContent: "space-between",
    gap: 24
  },
  screenContent: { flex: 1, gap: 14, paddingBottom: 12, minHeight: 0 },
  chatScreen: { flex: 1, minHeight: 0, gap: 8 },
  chatScrollArea: { flex: 1, minHeight: 0 },
  chatScrollContent: { gap: 10, paddingBottom: 8, flexGrow: 1 },
  voiceScreenContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingTop: 8,
    gap: 18
  },
  voiceSurfaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  voiceSurfaceIconButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.74)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  voiceSurfaceIconGlyph: {
    color: "#111111",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "500"
  },
  voiceSurfaceTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 8
  },
  voiceSurfaceTitle: { color: "#111111", fontSize: 30, lineHeight: 34, fontWeight: "500" },
  voiceSurfaceTitleAccent: { color: "#6b7280", fontSize: 30, lineHeight: 34, fontWeight: "400" },
  voiceSurfaceCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10
  },
  voiceSurfaceHeadline: {
    color: "#9ca3af",
    fontSize: 52,
    lineHeight: 58,
    fontWeight: "300",
    maxWidth: "100%",
    textAlign: "center"
  },
  voiceSurfaceHeadlineCompact: {
    fontSize: 44,
    lineHeight: 48
  },
  voiceSurfaceHeadlineTight: {
    fontSize: 38,
    lineHeight: 42
  },
  voiceSurfaceSubhead: {
    color: "#9aa0a8",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "400",
    textAlign: "center"
  },
  voiceSurfaceSubheadCompact: {
    fontSize: 18,
    lineHeight: 24
  },
  voiceSurfaceStatusPill: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10
  },
  voiceSurfaceStatusPillError: {
    backgroundColor: "rgba(254, 242, 242, 0.88)",
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  voiceSurfaceStatusPillInfo: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.06)"
  },
  voiceSurfaceStatusLabel: {
    color: "#4b5563",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center"
  },
  voicePeekPill: {
    alignSelf: "center",
    minWidth: 220,
    maxWidth: "92%",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 4,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  voicePeekEyebrow: {
    color: "#6b7280",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    textAlign: "center"
  },
  voicePeekTitle: { color: "#111111", fontSize: 15, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  voicePeekMeta: { color: "#7b8190", fontSize: 12, lineHeight: 18, textAlign: "center" },
  voicePeekAction: { color: "#4b5563", fontSize: 12, lineHeight: 16, fontWeight: "700", textAlign: "center", marginTop: 2 },
  voiceTranscriptPanel: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 28,
    padding: 16,
    gap: 12,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3
  },
  voiceTranscriptBody: { minHeight: 0 },
  voiceTranscriptBodyContent: { paddingBottom: 4 },
  voiceTranscriptHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  voiceTranscriptTitle: { color: "#111111", fontSize: 16, lineHeight: 20, fontWeight: "700", flex: 1 },
  voiceTranscriptToggle: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#efefec"
  },
  voiceTranscriptToggleLabel: { color: "#444444", fontSize: 12, fontWeight: "700" },
  voiceToolSheet: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 28,
    padding: 14,
    gap: 10,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  voiceSurfaceFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4
  },
  startVoiceSurfaceFooter: {
    paddingBottom: 8
  },
  voiceSurfaceRoundButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  voiceSurfaceRoundGlyph: { color: "#111111", fontSize: 28, lineHeight: 30, fontWeight: "400" },
  voiceSurfaceRoundLabel: { color: "#111111", fontSize: 13, lineHeight: 16, fontWeight: "700", textAlign: "center" },
  voiceSurfaceTypeButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.82)",
    justifyContent: "center",
    paddingHorizontal: 26,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  voiceSurfaceTypeButtonActive: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(31,140,240,0.16)"
  },
  voiceSurfaceTypeLabel: { color: "#5f636c", fontSize: 18, lineHeight: 22, fontWeight: "600" },
  voiceSurfaceTypeLabelActive: { color: "#10233e" },
  voiceSurfaceCompactButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  voiceSurfaceCompactButtonActive: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(31,140,240,0.16)"
  },
  voiceSurfaceCompactLabel: { color: "#111111", fontSize: 13, lineHeight: 16, fontWeight: "700", textAlign: "center" },
  voiceSurfaceCompactLabelActive: { color: "#10233e" },
  voiceComposerPanel: {
    marginTop: 10,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 28,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(23,34,37,0.08)",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5
  },
  voiceComposerPanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  voiceComposerPanelCopy: { flex: 1, gap: 2 },
  voiceComposerPanelEyebrow: {
    color: "#6b7280",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase"
  },
  voiceComposerPanelTitle: { color: "#10233e", fontSize: 21, lineHeight: 26, fontWeight: "700" },
  voiceComposerPanelHint: { color: "#5b6170", fontSize: 14, lineHeight: 20 },
  voiceComposerPanelCollapse: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eef1f5",
    alignItems: "center",
    justifyContent: "center"
  },
  voiceComposerPanelCollapseLabel: { color: "#394150", fontSize: 26, lineHeight: 28, fontWeight: "400" },
  voiceComposerPanelInput: {
    flex: 1,
    minHeight: 132,
    borderRadius: 22,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "rgba(23,34,37,0.08)",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    color: "#111111",
    fontSize: 19,
    lineHeight: 25
  },
  voiceComposerPanelInputActive: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(31,140,240,0.22)"
  },
  voiceSurfaceActionButton: {
    minWidth: 132,
    minHeight: 62,
    borderRadius: 31,
    backgroundColor: "#1f8cf0",
    justifyContent: "center",
    paddingHorizontal: 26,
    shadowColor: "#1f8cf0",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  voiceSurfaceActionLabel: { color: "#ffffff", fontSize: 24, lineHeight: 28, fontWeight: "500", textAlign: "center" },
  card: {
    backgroundColor: "rgba(255,250,243,0.94)",
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.08)"
  },
  sessionCard: { backgroundColor: "rgba(255,255,255,0.98)" },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#10233e" },
  supportingText: { color: "#5a6d87", lineHeight: 21 },
  metric: { color: "#334b66", lineHeight: 21 },
  rootPath: { color: "#10233e", fontFamily: "monospace", backgroundColor: "#f4f8fd", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "rgba(18, 50, 91, 0.06)" },
  buildResumeCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(23,34,37,0.06)"
  },
  buildResumeTitle: { color: "#172225", fontSize: 17, lineHeight: 21, fontWeight: "800" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  preferenceCopy: { flex: 1, paddingRight: 14, gap: 2 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  statusChipTeal: { backgroundColor: "#d9eef8" },
  statusChipOrange: { backgroundColor: "#fff1df" },
  statusChipLabel: { fontWeight: "800", fontSize: 12 },
  statusChipLabelTeal: { color: "#166b88" },
  statusChipLabelOrange: { color: "#b8641f" },
  primaryButton: {
    backgroundColor: "#172225",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center"
  },
  primaryLabel: { color: "#ffffff", fontWeight: "800" },
  secondaryButton: {
    backgroundColor: "#f2e7d7",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center"
  },
  topActionButton: { width: "100%" },
  topActionButtonStacked: { width: "100%" },
  secondaryLabel: { color: "#172225", fontWeight: "800" },
  warningButton: { backgroundColor: "#fff2d8" },
  warningButtonLabel: { color: "#9a5b1a" },
  dangerButton: { backgroundColor: "#fee2e2" },
  dangerButtonLabel: { color: "#b91c1c" },
  disabledButton: { opacity: 0.45 },
  disconnectButton: {
    alignSelf: "flex-start",
    backgroundColor: "#fff1df",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  disconnectLabel: { color: "#b8641f", fontWeight: "800" },
  error: { color: "#b91c1c", fontWeight: "600" },
  inputGroup: { gap: 6 },
  inputLabel: { color: "#334155", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#10233e",
    backgroundColor: "#fffdf8"
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: 14
  },
  chatSummaryCard: { paddingVertical: 14, gap: 8, flexShrink: 1 },
  chatSummaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  chatSummaryCopy: { flex: 1, gap: 8, minWidth: 0 },
  chatSummaryMeta: { alignItems: "flex-end", gap: 8 },
  chatSummaryBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  chatSummaryTitle: { fontSize: 18, lineHeight: 22, fontWeight: "800", color: "#0f172a" },
  chatSummaryMetaLine: { color: "#64748b", lineHeight: 18, fontSize: 12 },
  chatChromeCard: { paddingVertical: 12, gap: 8 },
  chatResumeButton: { alignSelf: "flex-start", minHeight: 40, paddingVertical: 10, paddingHorizontal: 14 },
  messages: { gap: 8 },
  voiceStageCard: {
    backgroundColor: "#0c171a",
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(86,211,255,0.12)"
  },
  voiceStageActions: { flexDirection: "row", gap: 10 },
  voicePeekCard: {
    backgroundColor: "rgba(255,250,243,0.94)",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(23,34,37,0.08)"
  },
  voiceTaskCard: {
    backgroundColor: "rgba(255,250,243,0.94)",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(23,34,37,0.08)"
  },
  voiceTaskEyebrow: { color: "#0f766e", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  voiceTaskTitle: { color: "#172225", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  voiceSessionCard: {
    gap: 16,
    paddingVertical: 18,
    backgroundColor: "#081114",
    borderColor: "rgba(86, 211, 255, 0.12)",
    borderRadius: 24
  },
  voiceSessionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  voiceSessionCopy: { flex: 1, gap: 4 },
  voicePanelTitle: { color: "#f1f7ff", fontSize: 22, lineHeight: 26, fontWeight: "800" },
  voicePanelSubtitle: { color: "#9ab6d3", fontSize: 13, lineHeight: 19 },
  voiceHeroRow: { gap: 16, alignItems: "center" },
  voiceOrbShell: {
    width: 164,
    height: 164,
    borderRadius: 82,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(86, 211, 255, 0.16)"
  },
  voiceOrbPulse: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "#2fb3d2"
  },
  voiceOrbHalo: {
    position: "absolute",
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: "rgba(86, 211, 255, 0.4)"
  },
  voiceOrbCore: {
    width: 66,
    height: 66,
    borderRadius: 33
  },
  voiceOrbListening: { backgroundColor: "#2fb3d2" },
  voiceOrbSpeaking: { backgroundColor: "#56d3ff" },
  voiceOrbProcessing: { backgroundColor: "#f5b14b" },
  voiceOrbMuted: { backgroundColor: "#7a8da6" },
  voiceOrbError: { backgroundColor: "#f28383" },
  voiceHeroCopy: { gap: 8, alignItems: "center" },
  voiceStateEyebrow: { color: "#9ec9f5", fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 },
  voiceHeroText: { color: "#eef6ff", fontSize: 18, lineHeight: 24, fontWeight: "600", textAlign: "center" },
  voiceTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  voiceTag: {
    color: "#d7eaff",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "700"
  },
  voiceMeterTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden"
  },
  voiceMeterFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#56d3ff"
  },
  voicePreviewLabel: { color: "#1b4f82", fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7 },
  voiceNotice: { color: "#f7e5b3", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  voiceMetrics: { color: "#9ab6d3", fontSize: 12, lineHeight: 18, textAlign: "center" },
  chatComposerCard: { marginTop: 2, padding: 10, gap: 8, borderRadius: 14 },
  voiceFirstFooterCard: { marginTop: 2, paddingVertical: 12, gap: 8, borderRadius: 14 },
  insetCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 10,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.06)"
  },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f2e7d7"
  },
  optionChipActive: { backgroundColor: "#172225" },
  optionChipLabel: { color: "#334b66", fontWeight: "700", fontSize: 12 },
  optionChipLabelActive: { color: "#ffffff" },
  optionChipMeta: { color: "#60758f", fontSize: 11, marginTop: 4, fontWeight: "600" },
  optionChipMetaActive: { color: "rgba(255,255,255,0.82)" },
  voiceChoiceList: { gap: 10 },
  voiceChoiceCard: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: "#f7efe2",
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.08)"
  },
  voiceChoiceCardActive: {
    backgroundColor: "#172225",
    borderColor: "#172225"
  },
  voiceChoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  voiceChoiceTitle: {
    flex: 1,
    color: "#203247",
    fontWeight: "800",
    fontSize: 14
  },
  voiceChoiceTitleActive: { color: "#ffffff" },
  voiceChoiceBody: {
    color: "#5f7288",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600"
  },
  voiceChoiceBodyActive: { color: "rgba(255,255,255,0.84)" },
  voiceBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  voiceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#e6dcc9"
  },
  voiceBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  voiceBadgeLabel: {
    color: "#5c6874",
    fontSize: 11,
    fontWeight: "800"
  },
  voiceBadgeLabelActive: { color: "#ffffff" },
  helperText: { color: "#687c97", fontSize: 12, lineHeight: 18 },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.06)"
  },
  userBubble: { backgroundColor: "#f2e7d7" },
  assistantBubble: { backgroundColor: "rgba(255,255,255,0.96)" },
  systemBubble: { backgroundColor: "#eef6ff", borderColor: "rgba(15, 118, 110, 0.16)" },
  messageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  messageRole: { fontWeight: "700", color: "#10233e" },
  messageTime: { color: "#6b7d95", fontSize: 12 },
  messageBlock: { gap: 8 },
  messageText: { color: "#334b66", lineHeight: 21 },
  messageCodeBlock: {
    backgroundColor: "#10233e",
    borderRadius: 8,
    padding: 12
  },
  messageCodeText: { color: "#e2e8f0", fontFamily: "monospace", lineHeight: 20 },
  messageMeta: { color: "#6b7d95", fontSize: 12 },
  messageActionButton: {
    alignSelf: "flex-start",
    marginTop: 2,
    backgroundColor: "#e2ebf8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  messageActionLabel: { color: "#1b4f82", fontWeight: "800", fontSize: 12 },
  workingBubble: { backgroundColor: "#fff7ed", borderColor: "rgba(184,100,31,0.12)" },
  workingBubbleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  workingGlyphWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#fff2d8",
    alignItems: "center",
    justifyContent: "center"
  },
  workingGlyph: { fontSize: 20, color: "#b8641f", fontWeight: "800" },
  workingCopy: { flex: 1, gap: 2 },
  composer: {
    minHeight: 72,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(23, 34, 37, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#10233e",
    backgroundColor: "#fffdf8"
  },
  composerCompact: { minHeight: 60, maxHeight: 104 },
  actions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chatActions: { flexDirection: "column" },
  chatActionButton: { width: "100%" },
  chatComposerActions: { flexDirection: "row" },
  chatComposerActionButton: { flex: 1 },
  banner: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca"
  },
  infoBanner: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe"
  },
  bannerLabel: {
    fontWeight: "700"
  },
  errorBannerLabel: {
    color: "#b91c1c"
  },
  infoBannerLabel: {
    color: "#1d4ed8"
  },
  operatorBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#d9eef8",
    color: "#166b88",
    fontWeight: "800",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12
  },
  kindBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e3ebf6",
    color: "#1b4f82",
    fontWeight: "800",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12
  },
  pinnedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fff1df",
    color: "#b8641f",
    fontWeight: "800",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12
  },
  styleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e2ebf8",
    color: "#1b4f82",
    fontWeight: "800",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12
  }
});
