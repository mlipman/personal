//
//  ContentView.swift
//  test app 1
//
//  Created by Michael Lipman on 8/8/26.
//

import SwiftUI

struct ContentView: View {
    @State private var selectedConcept = InterfaceConcept.commandCenter
    @State private var message = "Build a simple usage dashboard for the agent logs."

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Interface concept", selection: $selectedConcept) {
                    ForEach(InterfaceConcept.allCases) { concept in
                        Label(concept.title, systemImage: concept.icon)
                            .tag(concept)
                    }
                }
                .pickerStyle(.segmented)
                .padding([.horizontal, .top])

                ScrollView {
                    VStack(spacing: 18) {
                        switch selectedConcept {
                        case .commandCenter:
                            CommandCenterView(message: $message)
                        case .conversation:
                            ConversationView(message: $message)
                        case .missionControl:
                            MissionControlView()
                        }
                    }
                    .padding()
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle(selectedConcept.title)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                    } label: {
                        Image(systemName: "terminal")
                    }
                    .accessibilityLabel("Open terminal")
                }
            }
        }
    }
}

private enum InterfaceConcept: String, CaseIterable, Identifiable {
    case commandCenter
    case conversation
    case missionControl

    var id: Self { self }

    var title: String {
        switch self {
        case .commandCenter:
            "Command Center"
        case .conversation:
            "Conversation"
        case .missionControl:
            "Mission Control"
        }
    }

    var icon: String {
        switch self {
        case .commandCenter:
            "slider.horizontal.3"
        case .conversation:
            "bubble.left.and.bubble.right"
        case .missionControl:
            "rectangle.3.group"
        }
    }
}

private struct CommandCenterView: View {
    @Binding var message: String

    var body: some View {
        VStack(spacing: 16) {
            ServerHeaderView(
                title: "nyc3-ai-dev-01",
                subtitle: "Codex session online",
                status: "Healthy",
                tint: .green
            )

            VStack(alignment: .leading, spacing: 12) {
                SectionTitle("Direct the builder", icon: "paperplane")

                TextEditor(text: $message)
                    .frame(minHeight: 112)
                    .padding(10)
                    .scrollContentBackground(.hidden)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                HStack(spacing: 10) {
                    Button {
                    } label: {
                        Label("Send", systemImage: "arrow.up.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    Button {
                    } label: {
                        Image(systemName: "mic")
                            .frame(width: 42)
                    }
                    .buttonStyle(.bordered)
                    .accessibilityLabel("Dictate")
                }
            }
            .panelStyle()

            VStack(alignment: .leading, spacing: 12) {
                SectionTitle("Sandbox", icon: "lock.shield")

                StatusLine(
                    title: "Commands run automatically",
                    detail: "The droplet is the disposable boundary",
                    icon: "bolt.shield",
                    tint: .green
                )

                HStack(spacing: 10) {
                    ActionTile(title: "Branch", detail: "codex/agent-ui", icon: "point.3.connected.trianglepath.dotted")
                    ActionTile(title: "Snapshot", detail: "8 min ago", icon: "camera")
                }
            }
            .panelStyle()

            VStack(alignment: .leading, spacing: 10) {
                SectionTitle("Recent activity", icon: "clock")
                ActivityRow(title: "Edited dashboard routes", detail: "Committed to sandbox", status: .good)
                ActivityRow(title: "Ran tests", detail: "18 passed", status: .good)
                ActivityRow(title: "Pushed preview", detail: "app-logs.fly.dev", status: .neutral)
            }
            .panelStyle()
        }
    }
}

private struct ConversationView: View {
    @Binding var message: String

    var body: some View {
        VStack(spacing: 16) {
            ServerHeaderView(
                title: "Agent chat",
                subtitle: "Threaded control with visible intent",
                status: "Building",
                tint: .orange
            )

            VStack(spacing: 12) {
                ChatBubble(
                    author: "You",
                    text: "Create a tiny Rails app that lets me collect ideas and ship them as issues.",
                    alignment: .trailing,
                    tint: .blue
                )
                ChatBubble(
                    author: "Codex on droplet",
                    text: "I created the app skeleton, added auth stubs, and found one failing route spec.",
                    alignment: .leading,
                    tint: .gray
                )

                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Label("Checkpoint ready", systemImage: "flag.checkered")
                            .font(.headline)
                        Spacer()
                        Text("2 files")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    DiffSummary(file: "app/controllers/ideas_controller.rb", additions: 64, deletions: 8)
                    DiffSummary(file: "spec/requests/ideas_spec.rb", additions: 42, deletions: 0)

                    HStack {
                        Button("Reset sandbox") {
                        }
                        .buttonStyle(.bordered)

                        Button("Open preview") {
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .panelStyle()
            }

            ComposerView(message: $message)
        }
    }
}

private struct MissionControlView: View {
    var body: some View {
        VStack(spacing: 16) {
            ServerHeaderView(
                title: "Workspaces",
                subtitle: "Several AI builders, one awesome phone cockpit",
                status: "3 active",
                tint: .blue
            )

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                WorkspaceCard(name: "Prototype", repo: "idea-lab", state: "Coding", tint: .blue, progress: 0.72)
                WorkspaceCard(name: "Ops tool", repo: "log-scout", state: "Testing", tint: .green, progress: 0.48)
                WorkspaceCard(name: "Mobile", repo: "agent-remote", state: "Idle", tint: .purple, progress: 0.18)
                WorkspaceCard(name: "Sandbox", repo: "scratchpad", state: "Blocked", tint: .orange, progress: 0.31)
            }

            VStack(alignment: .leading, spacing: 12) {
                SectionTitle("Global controls", icon: "switch.2")

                StatusLine(
                    title: "Isolated droplet execution",
                    detail: "Agents can write freely inside their workspace",
                    icon: "server.rack",
                    tint: .blue
                )

                HStack(spacing: 10) {
                    ActionTile(title: "Snapshots", detail: "Every 15 min", icon: "camera.on.rectangle")
                    ActionTile(title: "TTL", detail: "Destroy in 6h", icon: "hourglass")
                }

                HStack(spacing: 10) {
                    Button {
                    } label: {
                        Label("Pause all", systemImage: "pause.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)

                    Button {
                    } label: {
                        Label("New task", systemImage: "plus")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .panelStyle()

            VStack(alignment: .leading, spacing: 10) {
                SectionTitle("Queue", icon: "list.bullet.rectangle")
                ActivityRow(title: "Deploy preview for idea-lab", detail: "Ready in 4 min", status: .neutral)
                ActivityRow(title: "Review auth migration", detail: "Checkpoint available", status: .warning)
                ActivityRow(title: "Summarize overnight work", detail: "Scheduled at 8:00 AM", status: .good)
            }
            .panelStyle()
        }
    }
}

private struct ServerHeaderView: View {
    let title: String
    let subtitle: String
    let status: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.title2.bold())
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Label(status, systemImage: "circle.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(tint)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(tint.opacity(0.12))
                    .clipShape(Capsule())
            }

            HStack(spacing: 12) {
                MetricView(value: "42%", label: "CPU")
                MetricView(value: "6.1 GB", label: "RAM")
                MetricView(value: "12", label: "Tasks")
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct MetricView: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct SectionTitle: View {
    let title: String
    let icon: String

    init(_ title: String, icon: String) {
        self.title = title
        self.icon = icon
    }

    var body: some View {
        Label(title, systemImage: icon)
            .font(.headline)
    }
}

private struct ActionTile: View {
    let title: String
    let detail: String
    let icon: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.blue)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.tertiarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct StatusLine: View {
    let title: String
    let detail: String
    let icon: String
    let tint: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(tint)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(12)
        .background(tint.opacity(0.10))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private enum ActivityStatus {
    case good
    case warning
    case neutral

    var color: Color {
        switch self {
        case .good:
            .green
        case .warning:
            .orange
        case .neutral:
            .blue
        }
    }

    var icon: String {
        switch self {
        case .good:
            "checkmark.circle.fill"
        case .warning:
            "exclamationmark.circle.fill"
        case .neutral:
            "arrow.triangle.2.circlepath.circle.fill"
        }
    }
}

private struct ActivityRow: View {
    let title: String
    let detail: String
    let status: ActivityStatus

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: status.icon)
                .foregroundStyle(status.color)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

private struct ChatBubble: View {
    let author: String
    let text: String
    let alignment: HorizontalAlignment
    let tint: Color

    var body: some View {
        HStack {
            if alignment == .trailing {
                Spacer(minLength: 32)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(author)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(text)
                    .font(.subheadline)
            }
            .padding(12)
            .background(tint.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 8))

            if alignment == .leading {
                Spacer(minLength: 32)
            }
        }
    }
}

private struct DiffSummary: View {
    let file: String
    let additions: Int
    let deletions: Int

    var body: some View {
        HStack {
            Image(systemName: "doc.text")
                .foregroundStyle(.secondary)
            Text(file)
                .font(.caption)
                .lineLimit(1)
            Spacer()
            Text("+\(additions)")
                .foregroundStyle(.green)
            Text("-\(deletions)")
                .foregroundStyle(.red)
        }
        .font(.caption.weight(.semibold))
    }
}

private struct ComposerView: View {
    @Binding var message: String

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Direct the agent", text: $message, axis: .vertical)
                .lineLimit(1...4)
                .textFieldStyle(.roundedBorder)

            Button {
            } label: {
                Image(systemName: "arrow.up")
                    .frame(width: 32, height: 32)
            }
            .buttonStyle(.borderedProminent)
            .accessibilityLabel("Send message")
        }
        .panelStyle()
    }
}

private struct WorkspaceCard: View {
    let name: String
    let repo: String
    let state: String
    let tint: Color
    let progress: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "shippingbox")
                    .foregroundStyle(tint)
                Spacer()
                Text(state)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(tint)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.headline)
                Text(repo)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ProgressView(value: progress)
                .tint(tint)
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private extension View {
    func panelStyle() -> some View {
        padding(14)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

#Preview {
    ContentView()
}
