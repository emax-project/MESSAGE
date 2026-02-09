import AppKit

let size: CGFloat = 1024
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()

// Transparent background
NSColor.clear.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: size, height: size)).fill()

// Draw sparkle star (4-point)
let starCenter = CGPoint(x: 210, y: 520)
let starOuter: CGFloat = 120
let starInner: CGFloat = 36
let starPath = NSBezierPath()
for i in 0..<8 {
    let angle = CGFloat(i) * .pi / 4.0
    let r = (i % 2 == 0) ? starOuter : starInner
    let x = starCenter.x + cos(angle) * r
    let y = starCenter.y + sin(angle) * r
    if i == 0 {
        starPath.move(to: CGPoint(x: x, y: y))
    } else {
        starPath.line(to: CGPoint(x: x, y: y))
    }
}
starPath.close()
NSColor.white.withAlphaComponent(0.95).setFill()
starPath.fill()

// Draw "EMAX" text
let fontSize: CGFloat = 220
let font = NSFont.systemFont(ofSize: fontSize, weight: .black)
let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: NSColor.white.withAlphaComponent(0.95),
    .kern: 2.0
]
let text = "EMAX" as NSString
let textSize = text.size(withAttributes: attrs)
let textOrigin = CGPoint(x: 320, y: (size - textSize.height) / 2 + 10)

// Subtle shadow for depth
let shadow = NSShadow()
shadow.shadowColor = NSColor.black.withAlphaComponent(0.25)
shadow.shadowBlurRadius = 12
shadow.shadowOffset = NSSize(width: 0, height: -4)
shadow.set()

text.draw(at: textOrigin, withAttributes: attrs)

image.unlockFocus()

// Export PNG
if let tiff = image.tiffRepresentation,
   let rep = NSBitmapImageRep(data: tiff),
   let png = rep.representation(using: .png, properties: [:]) {
    try? png.write(to: URL(fileURLWithPath: "/Users/seongu/code/04_MESSAGE/assets/emax-icon.png"))
}
