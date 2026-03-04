import Foundation
import CoreXLSX

nonisolated enum ParsingError: LocalizedError, Sendable {
    case fileNotFound
    case unsupportedFormat
    case parsingFailed(String)
    case noDataFound
    case insufficientDays
    case invalidWeek
    case missingColumns([String])

    var errorDescription: String? {
        switch self {
        case .fileNotFound:
            return "File not found."
        case .unsupportedFormat:
            return "File format not recognized. Please upload a standard TCG export."
        case .parsingFailed(let detail):
            return "Failed to parse file: \(detail)"
        case .noDataFound:
            return "No valid data rows found in the file."
        case .insufficientDays:
            return "Invalid week. Export a full 7-day range (7 consecutive dates)."
        case .invalidWeek:
            return "Invalid week. Export a full 7-day range (7 consecutive dates)."
        case .missingColumns(let missing):
            return "Missing required columns: \(missing.joined(separator: ", "))"
        }
    }
}

nonisolated struct FileParsingService: Sendable {

    private static let orderIdAliases = ["order #", "order number", "order id", "orderid", "order_id", "order no"]
    private static let dateAliases = ["order date", "date", "order created date", "date ordered", "order placed", "shipped date"]
    private static let priceAliases = ["product amt", "product price", "price", "total price", "item price", "product total", "total sales"]
    private static let shippingAliases = ["shipping amt", "shipping price", "ship price", "shipping cost", "seller shipping"]
    private static let statusAliases = ["order status", "status", "fulfillment status"]
    private static let quantityAliases = ["quantity", "qty", "item quantity", "items"]
    private static let feeAliases = ["tcgplayer fee", "fees", "marketplace fee", "total fees", "seller fee"]

    static func parseFile(at url: URL) throws -> [OrderRecord] {
        let ext = url.pathExtension.lowercased()
        switch ext {
        case "csv":
            return try parseCSV(at: url)
        case "xlsx":
            return try parseXLSX(at: url)
        default:
            throw ParsingError.unsupportedFormat
        }
    }

    static func groupIntoWeek(orders: [OrderRecord]) throws -> WeekData {
        guard !orders.isEmpty else { throw ParsingError.noDataFound }

        let calendar = Calendar.current
        let uniqueDays = Set(orders.map { calendar.startOfDay(for: $0.orderDate) })
        let sortedDays = uniqueDays.sorted()

        guard sortedDays.count == 7 else {
            throw ParsingError.invalidWeek
        }

        let firstDay = sortedDays[0]
        let lastDay = sortedDays[6]
        let span = calendar.dateComponents([.day], from: firstDay, to: lastDay).day ?? 0
        guard span == 6 else {
            throw ParsingError.invalidWeek
        }

        var dailyOrders = [Int](repeating: 0, count: 7)
        var dailyRevenue = [Double](repeating: 0.0, count: 7)
        var totalShipping = 0.0
        var totalFees = 0.0
        var totalOrders = 0
        var totalRevenue = 0.0

        for order in orders {
            let orderDay = calendar.startOfDay(for: order.orderDate)
            let dayIndex = calendar.dateComponents([.day], from: firstDay, to: orderDay).day ?? -1
            guard dayIndex >= 0, dayIndex < 7 else { continue }

            dailyOrders[dayIndex] += order.quantity
            dailyRevenue[dayIndex] += order.productPrice
            totalShipping += order.shippingPrice
            totalFees += order.fees
            totalOrders += order.quantity
            totalRevenue += order.productPrice
        }

        return WeekData(
            weekStart: firstDay,
            weekEnd: lastDay,
            dailyOrders: dailyOrders,
            dailyRevenue: dailyRevenue,
            totalOrders: totalOrders,
            totalRevenue: totalRevenue,
            totalShipping: totalShipping,
            totalFees: totalFees
        )
    }

    static func parseCSV(at url: URL) throws -> [OrderRecord] {
        let content: String
        do {
            content = try String(contentsOf: url, encoding: .utf8)
        } catch {
            do {
                content = try String(contentsOf: url, encoding: .isoLatin1)
            } catch {
                throw ParsingError.parsingFailed("Could not read file contents.")
            }
        }

        let lines = content.components(separatedBy: .newlines).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        guard lines.count >= 2 else { throw ParsingError.noDataFound }

        let headers = parseCSVLine(lines[0]).map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        let columnMap = mapColumns(headers: headers)

        var records: [OrderRecord] = []
        for i in 1..<lines.count {
            let values = parseCSVLine(lines[i])
            if let record = buildOrderRecord(from: values, columnMap: columnMap) {
                records.append(record)
            }
        }

        guard !records.isEmpty else { throw ParsingError.noDataFound }
        return records
    }

    static func parseCSVLine(_ line: String) -> [String] {
        var result: [String] = []
        var current = ""
        var inQuotes = false

        for char in line {
            if char == "\"" {
                inQuotes.toggle()
            } else if char == "," && !inQuotes {
                result.append(current)
                current = ""
            } else {
                current.append(char)
            }
        }
        result.append(current)
        return result
    }

    private static func parseXLSX(at url: URL) throws -> [OrderRecord] {
        guard let file = XLSXFile(filepath: url.path) else {
            throw ParsingError.parsingFailed("Could not open XLSX file.")
        }

        let sharedStrings = try? file.parseSharedStrings()

        for wbk in try file.parseWorkbooks() {
            for (_, path) in try file.parseWorksheetPathsAndNames(workbook: wbk) {
                let worksheet = try file.parseWorksheet(at: path)
                guard let rows = worksheet.data?.rows, rows.count >= 2 else { continue }

                let headers = rows[0].cells.map { cell -> String in
                    cellValue(cell, sharedStrings: sharedStrings).lowercased()
                }

                let columnMap = mapColumns(headers: headers)
                var records: [OrderRecord] = []

                for i in 1..<rows.count {
                    let values = rows[i].cells.map { cellValue($0, sharedStrings: sharedStrings) }
                    if let record = buildOrderRecord(from: values, columnMap: columnMap) {
                        records.append(record)
                    }
                }

                if !records.isEmpty { return records }
            }
        }

        throw ParsingError.noDataFound
    }

    private static func cellValue(_ cell: Cell, sharedStrings: SharedStrings?) -> String {
        if cell.type == .sharedString,
           let index = cell.value.flatMap({ Int($0) }),
           let sharedStrings,
           index < sharedStrings.items.count {
            return sharedStrings.items[index].text ?? ""
        }
        return cell.value ?? cell.inlineString?.text ?? ""
    }

    static func mapColumns(headers: [String]) -> [String: Int] {
        var map: [String: Int] = [:]

        let allMappings: [(String, [String])] = [
            ("orderId", orderIdAliases),
            ("date", dateAliases),
            ("price", priceAliases),
            ("shipping", shippingAliases),
            ("status", statusAliases),
            ("quantity", quantityAliases),
            ("fees", feeAliases)
        ]

        for (key, aliases) in allMappings {
            for (index, header) in headers.enumerated() {
                let cleaned = header.trimmingCharacters(in: .whitespacesAndNewlines)
                if aliases.contains(where: { cleaned.contains($0) }) {
                    map[key] = index
                    break
                }
            }
        }

        return map
    }

    static func buildOrderRecord(from values: [String], columnMap: [String: Int]) -> OrderRecord? {
        func value(for key: String) -> String? {
            guard let index = columnMap[key], index < values.count else { return nil }
            return values[index].trimmingCharacters(in: .whitespacesAndNewlines)
        }

        func doubleValue(for key: String) -> Double {
            guard let str = value(for: key) else { return 0 }
            let cleaned = str.replacingOccurrences(of: "$", with: "")
                .replacingOccurrences(of: ",", with: "")
                .replacingOccurrences(of: "(", with: "-")
                .replacingOccurrences(of: ")", with: "")
                .trimmingCharacters(in: .whitespaces)
            return Double(cleaned) ?? 0
        }

        func intValue(for key: String) -> Int {
            guard let str = value(for: key) else { return 1 }
            let cleaned = str.replacingOccurrences(of: ",", with: "").trimmingCharacters(in: .whitespaces)
            return Int(cleaned) ?? 1
        }

        let dateStr = value(for: "date") ?? ""
        guard let date = parseDate(dateStr) else { return nil }

        let statusStr = (value(for: "status") ?? "").lowercased()
        let validStatuses = ["shipped", "delivered", "complete", "completed"]
        if !statusStr.isEmpty && !validStatuses.contains(where: { statusStr.contains($0) }) {
            return nil
        }

        let price = doubleValue(for: "price")
        guard price > 0 else { return nil }

        let orderIdStr = value(for: "orderId")

        return OrderRecord(
            orderId: orderIdStr,
            orderDate: date,
            productPrice: price,
            shippingPrice: doubleValue(for: "shipping"),
            quantity: max(1, intValue(for: "quantity")),
            orderStatus: statusStr,
            fees: doubleValue(for: "fees")
        )
    }

    static func parseDate(_ string: String) -> Date? {
        let formats = ["EEEE, dd MMMM yyyy", "EEEE, d MMMM yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "M/d/yyyy", "MM-dd-yyyy", "dd/MM/yyyy", "MMM d, yyyy", "MMMM d, yyyy", "M/d/yy", "MM/dd/yy"]
        for format in formats {
            let f = DateFormatter()
            f.dateFormat = format
            f.locale = Locale(identifier: "en_US_POSIX")
            if let date = f.date(from: string) { return date }
        }
        return nil
    }
}
