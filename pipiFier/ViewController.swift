//
//  ViewController.swift
//  pipiFier
//
//  Created by Enver Daniel Francisco Báez on 4/21/25.
//

import Cocoa
import SafariServices
import WebKit

// The identifier for the Safari extension
let extensionBundleIdentifier = "com.archethoughts.pipiFier.Extension"

class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Set the navigation delegate to handle page load events
        self.webView.navigationDelegate = self

        // Add the script message handler to the web view's user content controller
        self.webView.configuration.userContentController.add(self, name: "controller")

        // Load the "Main.html" file from the app bundle into the web view
        if let url = Bundle.main.url(forResource: "Main", withExtension: "html") {
            self.webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.resourceURL!)
        } else {
            showError("Failed to load the HTML file.")
        }
    }

    // This method is called when the web view finishes loading
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Check the state of the Safari extension
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            // Handle error in fetching the extension state
            guard let state = state, error == nil else {
                self.showError("Failed to fetch extension state.")
                return
            }

            DispatchQueue.main.async {
                // Pass the extension state to the JavaScript in the web view
                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show(\(state.isEnabled), true)")
                } else {
                    webView.evaluateJavaScript("show(\(state.isEnabled), false)")
                }
            }
        }
    }

    // Handle messages from the web view's JavaScript
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        // If the message is "open-preferences", open the extension's preferences in Safari
        if let messageBody = message.body as? String, messageBody == "open-preferences" {
            SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
                DispatchQueue.main.async {
                    // Close the app after opening the preferences window
                    NSApplication.shared.terminate(nil)
                }
            }
        }
    }

    // Helper function to show an error alert
    private func showError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "Error"
        alert.informativeText = message
        alert.alertStyle = .warning
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}
