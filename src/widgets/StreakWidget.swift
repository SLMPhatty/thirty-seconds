import SwiftUI
import WidgetKit

struct StreakEntry: TimelineEntry {
    let date: Date
    let streak: Int
}

struct StreakProvider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), streak: 7)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let entry = loadEntry()
        let refresh = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }

    private func loadEntry() -> StreakEntry {
        let sharedDefaults = UserDefaults(suiteName: "group.com.thirty.app")
        let streak = sharedDefaults?.integer(forKey: "streak") ?? 0
        return StreakEntry(date: Date(), streak: streak)
    }
}

struct StreakWidgetEntryView: View {
    var entry: StreakProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("thirty")
                .font(.system(size: 20, weight: .semibold, design: .serif))
            Text("\(entry.streak) day streak")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.secondary)
            Spacer()
            Text("Breathe")
                .font(.system(size: 14, weight: .semibold))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(URL(string: "thirty://breathe"))
    }
}

struct StreakWidget: Widget {
    let kind = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Thirty")
        .description("Shows your current streak and a quick breathe shortcut.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}
