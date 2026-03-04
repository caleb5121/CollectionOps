import Foundation

struct LocalStorageService {
    private static let weeksKey = "cardops_weeks_v3"
    private static let shippingKey = "cardops_shipping_config_v3"
    private static let maxWeeks = 52

    static func saveWeek(_ week: WeekData) {
        var weeks = loadWeeks()
        weeks.removeAll {
            $0.game == week.game &&
            Calendar.current.isDate($0.weekStart, inSameDayAs: week.weekStart) &&
            Calendar.current.isDate($0.weekEnd, inSameDayAs: week.weekEnd)
        }
        weeks.append(week)
        weeks.sort { $0.weekStart > $1.weekStart }

        if weeks.count > maxWeeks {
            weeks = Array(weeks.prefix(maxWeeks))
        }

        guard let data = try? JSONEncoder().encode(weeks) else { return }
        UserDefaults.standard.set(data, forKey: weeksKey)
    }

    static func saveWeeksBatch(_ newWeeks: [WeekData], overwriteConflicts: Bool) -> Int {
        var weeks = loadWeeks()
        let calendar = Calendar.current
        var overwritten = 0

        for newWeek in newWeeks {
            let conflictIndex = weeks.firstIndex {
                $0.game == newWeek.game &&
                calendar.isDate($0.weekStart, inSameDayAs: newWeek.weekStart) &&
                calendar.isDate($0.weekEnd, inSameDayAs: newWeek.weekEnd)
            }

            if let idx = conflictIndex {
                if overwriteConflicts {
                    weeks[idx] = newWeek
                    overwritten += 1
                }
            } else {
                weeks.append(newWeek)
            }
        }

        weeks.sort { $0.weekStart > $1.weekStart }

        if weeks.count > maxWeeks {
            weeks = Array(weeks.prefix(maxWeeks))
        }

        guard let data = try? JSONEncoder().encode(weeks) else { return overwritten }
        UserDefaults.standard.set(data, forKey: weeksKey)
        return overwritten
    }

    static func loadWeeks() -> [WeekData] {
        guard let data = UserDefaults.standard.data(forKey: weeksKey),
              let weeks = try? JSONDecoder().decode([WeekData].self, from: data) else {
            return []
        }
        return weeks.sorted { $0.weekStart > $1.weekStart }
    }

    static func loadWeeks(for game: String?) -> [WeekData] {
        let weeks = loadWeeks()
        guard let game, game != "All Games" else { return weeks }
        return weeks.filter { $0.game == game }
    }

    static func recentUploads(limit: Int = 5) -> [WeekData] {
        loadWeeks().sorted { $0.uploadedAt > $1.uploadedAt }.prefix(limit).map { $0 }
    }

    static func clearWeeks() {
        UserDefaults.standard.removeObject(forKey: weeksKey)
    }

    static func saveShippingConfig(_ config: ShippingConfig) {
        guard let data = try? JSONEncoder().encode(config) else { return }
        UserDefaults.standard.set(data, forKey: shippingKey)
    }

    static func loadShippingConfig() -> ShippingConfig {
        guard let data = UserDefaults.standard.data(forKey: shippingKey),
              let config = try? JSONDecoder().decode(ShippingConfig.self, from: data) else {
            return ShippingConfig()
        }
        return config
    }

    static func copyToDocuments(from url: URL) throws -> URL {
        let destination = URL.documentsDirectory.appending(path: url.lastPathComponent)

        if FileManager.default.fileExists(atPath: destination.path()) {
            try FileManager.default.removeItem(at: destination)
        }

        if url.startAccessingSecurityScopedResource() {
            defer { url.stopAccessingSecurityScopedResource() }
            try FileManager.default.copyItem(at: url, to: destination)
        } else {
            try FileManager.default.copyItem(at: url, to: destination)
        }

        return destination
    }
}
