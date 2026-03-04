import Foundation

struct ImportSummary: Equatable {
    let game: String
    let dateRangeStart: Date
    let dateRangeEnd: Date
    let totalOrdersImported: Int
    let totalRevenueImported: Double
    let weeksCreated: Int
    let partialWeeksCount: Int
    let duplicatesRemoved: Int
    let overwrittenWeeks: Int
    let skippedRows: Int

    var dateRangeLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return "\(formatter.string(from: dateRangeStart)) → \(formatter.string(from: dateRangeEnd))"
    }
}
