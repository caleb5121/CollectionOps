import Foundation

nonisolated struct ShippingItem: Identifiable, Codable, Sendable, Equatable {
    let id: UUID
    var name: String
    var cost: Double

    init(id: UUID = UUID(), name: String, cost: Double) {
        self.id = id
        self.name = name
        self.cost = cost
    }
}

nonisolated struct ShippingProfile: Identifiable, Codable, Sendable, Equatable {
    let id: UUID
    var name: String
    var averageCostPerShipment: Double
    var isActive: Bool
    var capacityNote: String
    var notes: String
    var breakdown: [ShippingItem]

    init(
        id: UUID = UUID(),
        name: String,
        averageCostPerShipment: Double,
        isActive: Bool = true,
        capacityNote: String = "",
        notes: String = "",
        breakdown: [ShippingItem] = []
    ) {
        self.id = id
        self.name = name
        self.averageCostPerShipment = averageCostPerShipment
        self.isActive = isActive
        self.capacityNote = capacityNote
        self.notes = notes
        self.breakdown = breakdown
    }
}

nonisolated struct ShippingConfig: Codable, Sendable, Equatable {
    var profiles: [ShippingProfile]
    var weeklyMixPercentages: [UUID: Double]

    init(
        profiles: [ShippingProfile] = [
            ShippingProfile(name: "Letter", averageCostPerShipment: 0.95),
            ShippingProfile(name: "Tracked", averageCostPerShipment: 4.25)
        ],
        weeklyMixPercentages: [UUID: Double] = [:]
    ) {
        self.profiles = profiles
        self.weeklyMixPercentages = weeklyMixPercentages
        ensureValidMixes()
    }

    var activeProfiles: [ShippingProfile] {
        profiles.filter(\.isActive)
    }

    var blendedShippingCost: Double {
        let active = activeProfiles
        guard !active.isEmpty else { return 0 }
        let mixes = normalizedMixes
        return active.reduce(0) { partial, profile in
            let mix = mixes[profile.id] ?? 0
            return partial + profile.averageCostPerShipment * mix
        }
    }

    var dominantProfileID: UUID? {
        let active = activeProfiles
        guard !active.isEmpty else { return nil }
        let mixes = normalizedMixes
        return active.max(by: {
            ($0.averageCostPerShipment * (mixes[$0.id] ?? 0)) < ($1.averageCostPerShipment * (mixes[$1.id] ?? 0))
        })?.id
    }

    var isConfigured: Bool {
        !activeProfiles.isEmpty && blendedShippingCost > 0
    }

    var normalizedMixes: [UUID: Double] {
        let active = activeProfiles
        guard !active.isEmpty else { return [:] }

        let activeIDs = Set(active.map(\.id))
        let provided = weeklyMixPercentages.filter { activeIDs.contains($0.key) }
        let total = provided.values.reduce(0, +)

        if total <= 0 {
            let even = 1.0 / Double(active.count)
            return Dictionary(uniqueKeysWithValues: active.map { ($0.id, even) })
        }

        return Dictionary(uniqueKeysWithValues: active.map { profile in
            let pct = provided[profile.id] ?? 0
            return (profile.id, pct / total)
        })
    }

    mutating func ensureValidMixes() {
        let active = activeProfiles
        guard !active.isEmpty else {
            weeklyMixPercentages = [:]
            return
        }

        let ids = Set(active.map(\.id))
        weeklyMixPercentages = weeklyMixPercentages.filter { ids.contains($0.key) }

        let total = weeklyMixPercentages.values.reduce(0, +)
        if total <= 0 {
            let even = 100.0 / Double(active.count)
            weeklyMixPercentages = Dictionary(uniqueKeysWithValues: active.map { ($0.id, even) })
        }
    }
}
