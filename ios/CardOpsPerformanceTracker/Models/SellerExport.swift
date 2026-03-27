import Foundation

nonisolated struct OrderRecord: Codable, Sendable {
    let orderId: String?
    let orderDate: Date
    let productPrice: Double
    let shippingPrice: Double
    let quantity: Int
    let orderStatus: String
    let fees: Double

    init(
        orderId: String? = nil,
        orderDate: Date,
        productPrice: Double,
        shippingPrice: Double,
        quantity: Int,
        orderStatus: String,
        fees: Double
    ) {
        self.orderId = orderId
        self.orderDate = orderDate
        self.productPrice = productPrice
        self.shippingPrice = shippingPrice
        self.quantity = quantity
        self.orderStatus = orderStatus
        self.fees = fees
    }
}
