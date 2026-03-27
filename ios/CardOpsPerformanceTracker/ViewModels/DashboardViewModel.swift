import Foundation
import SwiftUI

@Observable
@MainActor
class DashboardViewModel {
    var weeks: [WeekData] = []
    var shippingConfig: ShippingConfig = ShippingConfig()

    var selectedDashboardGame: String = "All Games"
    var selectedUploadGame: String = "Pokémon"

    var showingFilePicker: Bool = false
    var showingHistoryFilePicker: Bool = false
    var errorMessage: String?
    var uploadSuccess: Bool = false
    var uploadMessage: String?

    var pendingImportedWeek: WeekData?
    var showingDuplicatePrompt: Bool = false

    var isSimulationMode: Bool = false
    var simulationLabel: String = ""
    private var simulationWeeks: [WeekData] = []
    private var simulationShipping: ShippingConfig?

    var importPhase: ImportPhase = .idle
    var importSummary: ImportSummary?
    var showingImportSummary: Bool = false
    var showingImportConflictPrompt: Bool = false
    var pendingImportResult: HistoryImportService.SegmentResult?
    var pendingImportConflictCount: Int = 0

    var availableGames: [String] {
        let grouped = Dictionary(grouping: liveWeeks, by: \.game)
        let ordered = grouped
            .map { game, items in
                let latest = items.max(by: { $0.weekStart < $1.weekStart })?.totalRevenue ?? 0
                return (game: game, revenue: latest)
            }
            .sorted { $0.revenue > $1.revenue }
            .map(\.game)
        return ["All Games"] + ordered
    }

    var gameUploadOptions: [String] {
        ["Pokémon", "Yu-Gi-Oh!", "Magic", "Sports Cards", "One Piece"]
    }

    var selectedAccent: Color {
        CardOpsTheme.accent(for: selectedDashboardGame)
    }

    var activeWeeks: [WeekData] {
        if isSimulationMode { return simulationWeeks.sorted { $0.weekStart > $1.weekStart } }
        if selectedDashboardGame == "All Games" {
            return mergedAllGamesWeeks
        }
        return liveWeeks.filter { $0.game == selectedDashboardGame }.sorted { $0.weekStart > $1.weekStart }
    }

    var fullWeeks: [WeekData] {
        activeWeeks.filter { !$0.isPartial }
    }

    var hasData: Bool { !activeWeeks.isEmpty }
    var currentWeek: WeekData? { fullWeeks.first ?? activeWeeks.first }
    var previousWeek: WeekData? {
        let weeks = fullWeeks
        guard weeks.count > 1 else { return nil }
        return weeks[1]
    }

    var currentWeekIsPartial: Bool {
        activeWeeks.first?.isPartial == true
    }

    var momentum: Double {
        guard let currentWeek else { return 0 }
        return ScoreEngine.momentum(for: currentWeek)
    }

    var flow: Double? {
        guard let currentWeek else { return nil }
        return ScoreEngine.flow(currentWeek: currentWeek, allWeeks: fullWeeks)
    }

    var efficiency: Double {
        guard let currentWeek else { return 0 }
        let activeShipping = isSimulationMode ? simulationShipping : shippingConfig
        return ScoreEngine.efficiency(for: currentWeek, shippingConfig: activeShipping?.isConfigured == true ? activeShipping : nil)
    }

    var flowLocked: Bool { flow == nil }

    var momentumDelta: Double {
        guard !currentWeekIsPartial, let previous = previousWeek else { return 0 }
        return momentum - ScoreEngine.momentum(for: previous)
    }

    var flowDelta: Double {
        guard
            !currentWeekIsPartial,
            let current = currentWeek,
            let previous = previousWeek,
            let currentFlow = ScoreEngine.flow(currentWeek: current, allWeeks: fullWeeks)
        else { return 0 }

        let shiftedWeeks = Array(fullWeeks.dropFirst())
        guard let previousFlow = ScoreEngine.flow(currentWeek: previous, allWeeks: shiftedWeeks) else {
            return 0
        }
        return currentFlow - previousFlow
    }

    var efficiencyDelta: Double {
        guard !currentWeekIsPartial, let previous = previousWeek else { return 0 }
        let activeShipping = isSimulationMode ? simulationShipping : shippingConfig
        let previousScore = ScoreEngine.efficiency(for: previous, shippingConfig: activeShipping?.isConfigured == true ? activeShipping : nil)
        return efficiency - previousScore
    }

    var revenueDelta: Double {
        guard !currentWeekIsPartial, let current = currentWeek, let previous = previousWeek else { return 0 }
        return pctDelta(newValue: current.totalRevenue, oldValue: previous.totalRevenue)
    }

    var ordersDelta: Double {
        guard !currentWeekIsPartial, let current = currentWeek, let previous = previousWeek else { return 0 }
        return pctDelta(newValue: Double(current.totalOrders), oldValue: Double(previous.totalOrders))
    }

    var aovDelta: Double {
        guard !currentWeekIsPartial, let current = currentWeek, let previous = previousWeek else { return 0 }
        return pctDelta(newValue: current.averageOrderValue, oldValue: previous.averageOrderValue)
    }

    var recentUploads: [WeekData] {
        LocalStorageService.recentUploads(limit: 5)
    }

    var miniBreakdown: [(game: String, revenue: Double)] {
        guard selectedDashboardGame == "All Games", let week = currentWeek else { return [] }
        return liveWeeks
            .filter { Calendar.current.isDate($0.weekStart, inSameDayAs: week.weekStart) }
            .reduce(into: [String: Double]()) { partial, item in
                partial[item.game, default: 0] += item.totalRevenue
            }
            .map { ($0.key, $0.value) }
            .sorted { $0.revenue > $1.revenue }
    }

    var actionPulse: String {
        guard let week = currentWeek else { return "Upload a weekly export to generate operational signals." }
        if currentWeekIsPartial {
            return "Current week is partial — waiting for full 7-day data."
        }
        let shippingImpact = shippingConfig.blendedShippingCost * Double(week.totalOrders)
        if shippingImpact > week.totalRevenue * 0.18 {
            return "Shipping cost impact increased"
        }
        if week.averageOrderValue > (previousWeek?.averageOrderValue ?? week.averageOrderValue) {
            return "AOV improved this week"
        }
        if let top = miniBreakdown.first {
            let share = top.revenue / max(week.totalRevenue, 1)
            return "\(top.game) driving \(Int((share * 100).rounded()))% of revenue"
        }
        return "\(week.totalOrders) orders this week"
    }

    var insightSignals: [String] {
        var items: [String] = []
        if currentWeekIsPartial {
            items.append("Current week is partial — deltas suppressed")
        }
        items.append(revenueDelta >= 0 ? "Revenue improved week over week" : "Revenue cooled week over week")
        items.append(ordersDelta >= 0 ? "Orders increased" : "Orders declined")
        items.append(efficiencyDelta >= 0 ? "Efficiency structure improved" : "Efficiency structure softened")
        if let top = miniBreakdown.first, let week = currentWeek {
            let pct = Int((top.revenue / max(week.totalRevenue, 1) * 100).rounded())
            items.append("\(top.game) driving \(pct)% of revenue")
        }
        return Array(items.prefix(4))
    }

    var topGame: String {
        miniBreakdown.first?.game ?? selectedDashboardGame
    }

    var isImporting: Bool {
        switch importPhase {
        case .idle, .complete, .failed: return false
        default: return true
        }
    }

    func loadSavedData() {
        weeks = LocalStorageService.loadWeeks()
        shippingConfig = LocalStorageService.loadShippingConfig()
        shippingConfig.ensureValidMixes()
        if !availableGames.contains(selectedDashboardGame) {
            selectedDashboardGame = "All Games"
        }
    }

    func handleFileImport(result: Result<URL, Error>) {
        uploadSuccess = false
        uploadMessage = nil
        errorMessage = nil

        switch result {
        case .success(let url):
            do {
                let localURL = try LocalStorageService.copyToDocuments(from: url)
                let orders = try FileParsingService.parseFile(at: localURL)
                let week = try FileParsingService.groupIntoWeek(orders: orders)
                let gameWeek = WeekData(
                    game: selectedUploadGame,
                    weekStart: week.weekStart,
                    weekEnd: week.weekEnd,
                    dailyOrders: week.dailyOrders,
                    dailyRevenue: week.dailyRevenue,
                    totalOrders: week.totalOrders,
                    totalRevenue: week.totalRevenue,
                    totalShipping: week.totalShipping,
                    totalFees: week.totalFees
                )

                let duplicate = weeks.contains {
                    $0.game == gameWeek.game &&
                    Calendar.current.isDate($0.weekStart, inSameDayAs: gameWeek.weekStart) &&
                    Calendar.current.isDate($0.weekEnd, inSameDayAs: gameWeek.weekEnd)
                }

                if duplicate {
                    pendingImportedWeek = gameWeek
                    showingDuplicatePrompt = true
                } else {
                    persistUploadedWeek(gameWeek)
                }
            } catch let error as ParsingError {
                errorMessage = error.errorDescription
            } catch {
                errorMessage = "File format not recognized. Please upload a standard TCG export."
            }
        case .failure:
            errorMessage = "Could not access the selected file."
        }
    }

    func handleHistoryImport(result: Result<URL, Error>) {
        errorMessage = nil
        importSummary = nil

        switch result {
        case .success(let url):
            Task {
                await runHistoryImport(url: url)
            }
        case .failure:
            errorMessage = "Could not access the selected file."
        }
    }

    private func runHistoryImport(url: URL) async {
        importPhase = .parsing

        do {
            let localURL = try LocalStorageService.copyToDocuments(from: url)

            importPhase = .normalizing
            try? await Task.sleep(for: .milliseconds(100))

            importPhase = .deduplicating
            try? await Task.sleep(for: .milliseconds(100))

            importPhase = .segmenting

            let segmentResult = try HistoryImportService.parseAndSegment(
                fileURL: localURL,
                game: selectedUploadGame
            )

            guard !segmentResult.weeks.isEmpty else {
                importPhase = .failed("No valid weeks found in the data.")
                return
            }

            let conflicts = HistoryImportService.findConflicts(
                newWeeks: segmentResult.weeks,
                existingWeeks: weeks
            )

            if !conflicts.isEmpty {
                pendingImportResult = segmentResult
                pendingImportConflictCount = conflicts.count
                showingImportConflictPrompt = true
                importPhase = .idle
            } else {
                await commitImport(segmentResult: segmentResult, overwrite: false)
            }
        } catch let error as ParsingError {
            importPhase = .failed(error.errorDescription ?? "Unknown error")
        } catch {
            importPhase = .failed("Failed to process file.")
        }
    }

    func confirmImportOverwrite() {
        guard let result = pendingImportResult else { return }
        showingImportConflictPrompt = false
        Task {
            await commitImport(segmentResult: result, overwrite: true)
        }
    }

    func cancelImportOverwrite() {
        pendingImportResult = nil
        pendingImportConflictCount = 0
        showingImportConflictPrompt = false
        importPhase = .idle
    }

    private func commitImport(segmentResult: HistoryImportService.SegmentResult, overwrite: Bool) async {
        importPhase = .saving
        try? await Task.sleep(for: .milliseconds(100))

        let overwritten = LocalStorageService.saveWeeksBatch(segmentResult.weeks, overwriteConflicts: overwrite)
        weeks = LocalStorageService.loadWeeks()

        let summary = ImportSummary(
            game: selectedUploadGame,
            dateRangeStart: segmentResult.dateRangeStart,
            dateRangeEnd: segmentResult.dateRangeEnd,
            totalOrdersImported: segmentResult.totalOrders,
            totalRevenueImported: segmentResult.totalRevenue,
            weeksCreated: segmentResult.weeks.count,
            partialWeeksCount: segmentResult.partialWeeksCount,
            duplicatesRemoved: segmentResult.duplicatesRemoved,
            overwrittenWeeks: overwritten,
            skippedRows: segmentResult.skippedRows
        )

        importSummary = summary
        showingImportSummary = true
        importPhase = .complete
        pendingImportResult = nil

        selectedDashboardGame = selectedUploadGame
    }

    func dismissImportSummary() {
        showingImportSummary = false
        importPhase = .idle
    }

    func confirmOverwritePendingImport() {
        guard let pendingImportedWeek else { return }
        persistUploadedWeek(pendingImportedWeek)
        self.pendingImportedWeek = nil
    }

    func cancelPendingImport() {
        pendingImportedWeek = nil
        showingDuplicatePrompt = false
    }

    func clearHistory() {
        LocalStorageService.clearWeeks()
        weeks = []
        uploadSuccess = false
        uploadMessage = nil
        exitSimulation()
    }

    func saveShippingConfig() {
        shippingConfig.ensureValidMixes()
        LocalStorageService.saveShippingConfig(shippingConfig)
    }

    func setMixPercentage(for profileID: UUID, percentage: Double) {
        let active = shippingConfig.activeProfiles
        guard let index = active.firstIndex(where: { $0.id == profileID }) else { return }

        let clamped = max(0, min(100, percentage))

        if active.count == 1 {
            shippingConfig.weeklyMixPercentages[profileID] = 100
            return
        }

        if active.count == 2 {
            let otherID = active[1 - index].id
            shippingConfig.weeklyMixPercentages[profileID] = clamped
            shippingConfig.weeklyMixPercentages[otherID] = 100 - clamped
            return
        }

        shippingConfig.weeklyMixPercentages[profileID] = clamped
        let remainingIDs = active.map(\.id).filter { $0 != profileID }
        let remainingTotal = max(0, 100 - clamped)
        let even = remainingTotal / Double(remainingIDs.count)
        remainingIDs.forEach { shippingConfig.weeklyMixPercentages[$0] = even }
    }

    func addShippingProfile() {
        guard shippingConfig.profiles.count < 10 else { return }
        let profile = ShippingProfile(name: "New Profile", averageCostPerShipment: 1.00, isActive: true)
        shippingConfig.profiles.append(profile)
        shippingConfig.ensureValidMixes()
    }

    func duplicateShippingProfile(id: UUID) {
        guard shippingConfig.profiles.count < 10,
              let source = shippingConfig.profiles.first(where: { $0.id == id }) else { return }

        let duplicated = ShippingProfile(
            name: "\(source.name) Copy",
            averageCostPerShipment: source.averageCostPerShipment,
            isActive: source.isActive,
            capacityNote: source.capacityNote,
            notes: source.notes,
            breakdown: source.breakdown
        )
        shippingConfig.profiles.append(duplicated)
        shippingConfig.ensureValidMixes()
    }

    func deleteShippingProfile(id: UUID) {
        shippingConfig.profiles.removeAll { $0.id == id }
        shippingConfig.ensureValidMixes()
    }

    func resetShippingBaseline() {
        shippingConfig = ShippingConfig()
    }

    func exitSimulation() {
        isSimulationMode = false
        simulationLabel = ""
        simulationWeeks = []
        simulationShipping = nil
    }

    func loadRealSalesData() async -> String? {
        guard let bundleURL = Bundle.main.url(forResource: "my_sales_data", withExtension: "csv") else {
            return "Could not find bundled sales data."
        }
        do {
            let result = try HistoryImportService.parseAndSegment(fileURL: bundleURL, game: "Pokémon")
            guard !result.weeks.isEmpty else { return "No valid weeks found in data." }
            _ = LocalStorageService.saveWeeksBatch(result.weeks, overwriteConflicts: true)
            weeks = LocalStorageService.loadWeeks()
            selectedDashboardGame = "Pokémon"
            return nil
        } catch let error as ParsingError {
            return error.errorDescription
        } catch {
            return "Failed to load sales data."
        }
    }

    func loadScenario1() {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        guard
            let w0 = cal.date(byAdding: .day, value: -6, to: today),
            let w1 = cal.date(byAdding: .day, value: -13, to: today),
            let w2 = cal.date(byAdding: .day, value: -20, to: today)
        else { return }

        simulationWeeks = [
            makeWeek(game: "Pokémon", start: w0, orders: [1,0,2,0,1,0,1], revenue: [6,0,12,0,7,0,6]),
            makeWeek(game: "Pokémon", start: w1, orders: [1,1,2,0,0,1,1], revenue: [6,6,10,0,0,6,6]),
            makeWeek(game: "Pokémon", start: w2, orders: [0,1,1,1,0,1,0], revenue: [0,7,6,6,0,7,0])
        ]

        let letter = ShippingProfile(name: "Letter", averageCostPerShipment: 0.90, isActive: true)
        let tracked = ShippingProfile(name: "Tracked", averageCostPerShipment: 4.50, isActive: true)
        simulationShipping = ShippingConfig(
            profiles: [letter, tracked],
            weeklyMixPercentages: [letter.id: 100, tracked.id: 0]
        )
        simulationLabel = "Scenario 1: Small Seller"
        isSimulationMode = true
    }

    func loadScenario2() {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        guard
            let w0 = cal.date(byAdding: .day, value: -6, to: today),
            let w1 = cal.date(byAdding: .day, value: -13, to: today),
            let w2 = cal.date(byAdding: .day, value: -20, to: today)
        else { return }

        simulationWeeks = [
            makeWeek(game: "Pokémon", start: w0, orders: [4,3,5,4,6,4,5], revenue: [60,45,75,65,90,60,80]),
            makeWeek(game: "Pokémon", start: w1, orders: [4,4,4,3,5,4,4], revenue: [58,52,62,49,76,61,66]),
            makeWeek(game: "Pokémon", start: w2, orders: [3,4,5,4,5,3,4], revenue: [47,59,74,63,82,52,60])
        ]

        let letter = ShippingProfile(name: "Letter", averageCostPerShipment: 0.95, isActive: true)
        let tracked = ShippingProfile(name: "Tracked", averageCostPerShipment: 4.25, isActive: true)
        simulationShipping = ShippingConfig(
            profiles: [letter, tracked],
            weeklyMixPercentages: [letter.id: 80, tracked.id: 20]
        )
        simulationLabel = "Scenario 2: Mid Seller"
        isSimulationMode = true
    }

    func loadScenario3() {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        guard
            let w0 = cal.date(byAdding: .day, value: -6, to: today),
            let w1 = cal.date(byAdding: .day, value: -13, to: today),
            let w2 = cal.date(byAdding: .day, value: -20, to: today),
            let w3 = cal.date(byAdding: .day, value: -27, to: today)
        else { return }

        simulationWeeks = [
            makeWeek(game: "Sports Cards", start: w0, orders: [18,22,20,25,30,24,28], revenue: [280,320,290,1500,420,360,1100]),
            makeWeek(game: "Sports Cards", start: w1, orders: [19,20,21,22,21,20,22], revenue: [350,380,410,470,400,380,460]),
            makeWeek(game: "Sports Cards", start: w2, orders: [17,18,19,20,21,20,19], revenue: [320,340,360,390,420,390,370]),
            makeWeek(game: "Sports Cards", start: w3, orders: [20,19,21,22,20,21,20], revenue: [390,360,430,460,410,420,405])
        ]

        let letter = ShippingProfile(name: "Letter", averageCostPerShipment: 0.85, isActive: true)
        let tracked = ShippingProfile(name: "Tracked", averageCostPerShipment: 4.75, isActive: true)
        simulationShipping = ShippingConfig(
            profiles: [letter, tracked],
            weeklyMixPercentages: [letter.id: 70, tracked.id: 30]
        )
        simulationLabel = "Scenario 3: Large Seller"
        isSimulationMode = true
    }

    private var liveWeeks: [WeekData] {
        weeks.sorted { $0.weekStart > $1.weekStart }
    }

    private var mergedAllGamesWeeks: [WeekData] {
        let grouped = Dictionary(grouping: liveWeeks) { Calendar.current.startOfDay(for: $0.weekStart) }

        return grouped.compactMap { _, entries in
            guard let first = entries.first else { return nil }
            let totalOrders = entries.reduce(0) { $0 + $1.totalOrders }
            let totalRevenue = entries.reduce(0) { $0 + $1.totalRevenue }
            let totalShipping = entries.reduce(0) { $0 + $1.totalShipping }
            let totalFees = entries.reduce(0) { $0 + $1.totalFees }
            let anyPartial = entries.contains(where: \.isPartial)

            let maxDays = entries.map { min($0.dailyOrders.count, $0.dailyRevenue.count) }.max() ?? 0
            var dailyOrders = [Int](repeating: 0, count: maxDays)
            var dailyRevenue = [Double](repeating: 0, count: maxDays)

            for entry in entries {
                for i in 0..<min(entry.dailyOrders.count, maxDays) {
                    dailyOrders[i] += entry.dailyOrders[i]
                }
                for i in 0..<min(entry.dailyRevenue.count, maxDays) {
                    dailyRevenue[i] += entry.dailyRevenue[i]
                }
            }

            return WeekData(
                game: "All Games",
                weekStart: first.weekStart,
                weekEnd: first.weekEnd,
                dailyOrders: dailyOrders,
                dailyRevenue: dailyRevenue,
                totalOrders: totalOrders,
                totalRevenue: totalRevenue,
                totalShipping: totalShipping,
                totalFees: totalFees,
                uploadedAt: entries.map(\.uploadedAt).max() ?? Date(),
                isPartial: anyPartial
            )
        }
        .sorted { $0.weekStart > $1.weekStart }
    }

    private func persistUploadedWeek(_ week: WeekData) {
        LocalStorageService.saveWeek(week)
        weeks = LocalStorageService.loadWeeks()
        selectedDashboardGame = week.game
        uploadSuccess = true
        showingDuplicatePrompt = false
        uploadMessage = "Saved as: \(week.game) • Week: \(week.weekLabel) • Orders: \(week.totalOrders) • Revenue: \(week.totalRevenue.formatted(.currency(code: "USD").precision(.fractionLength(2))))"
    }

    private func pctDelta(newValue: Double, oldValue: Double) -> Double {
        (newValue - oldValue) / max(abs(oldValue), 1) * 100
    }

    private func makeWeek(game: String, start: Date, orders: [Int], revenue: [Double]) -> WeekData {
        let end = Calendar.current.date(byAdding: .day, value: 6, to: start) ?? start
        return WeekData(
            game: game,
            weekStart: start,
            weekEnd: end,
            dailyOrders: orders,
            dailyRevenue: revenue,
            totalOrders: orders.reduce(0, +),
            totalRevenue: revenue.reduce(0, +)
        )
    }
}
