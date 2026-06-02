import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        OperationsWebView(url: URL(string: "https://subtle-alpaca-e4a134.netlify.app/")!)
            .ignoresSafeArea(.container, edges: .bottom)
    }
}

struct OperationsWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
