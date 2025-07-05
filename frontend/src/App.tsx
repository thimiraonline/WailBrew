import React, { useState, useEffect } from "react";
import "./style.css";
import "./app.css";
import {
    GetBrewPackages,
    GetBrewUpdatablePackages,
    GetBrewPackageInfo,
    GetBrewPackageInfoAsJson,
    RemoveBrewPackage,
    UpdateBrewPackage,
} from "../wailsjs/go/main/App";
import appIcon from "./assets/images/appicon_256.png";
import packageJson from "../package.json";

interface PackageEntry {
    name: string;
    installedVersion: string;
    latestVersion?: string;
    desc?: string;
    homepage?: string;
    dependencies?: string[];
    conflicts?: string[];
}

const WailBrewApp = () => {
    const [packages, setPackages] = useState<PackageEntry[]>([]);
    const [updatablePackages, setUpdatablePackages] = useState<PackageEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [view, setView] = useState<"installed" | "updatable">("installed");
    const [selectedPackage, setSelectedPackage] = useState<PackageEntry | null>(null);
    const [loadingDetailsFor, setLoadingDetailsFor] = useState<string | null>(null);
    const [packageCache, setPackageCache] = useState<Map<string, PackageEntry>>(new Map());
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [showConfirm, setShowConfirm] = useState<boolean>(false);
    const [showUpdateConfirm, setShowUpdateConfirm] = useState<boolean>(false);
    const [updateLogs, setUpdateLogs] = useState<string | null>(null);
    const [infoLogs, setInfoLogs] = useState<string | null>(null);
    const appVersion = packageJson.version;

    useEffect(() => {
        setLoading(true);
        Promise.all([GetBrewPackages(), GetBrewUpdatablePackages()])
            .then(([installed, updatable]) => {
                const installedFormatted = installed.map(([name, installedVersion]) => ({
                    name,
                    installedVersion,
                }));
                const updatableFormatted = updatable.map(([name, installedVersion, latestVersion]) => ({
                    name,
                    installedVersion,
                    latestVersion,
                }));
                setPackages(installedFormatted);
                setUpdatablePackages(updatableFormatted);
                setLoading(false);
            })
            .catch(() => {
                setError("❌ Fehler beim Laden der Formeln!");
                setLoading(false);
            });
    }, []);

    const activePackages = view === "installed" ? packages : updatablePackages;

    const filteredPackages = activePackages.filter((pkg) =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = async (pkg: PackageEntry) => {
        setSelectedPackage(pkg);

        if (packageCache.has(pkg.name)) {
            setSelectedPackage(packageCache.get(pkg.name)!);
            return;
        }

        setLoadingDetailsFor(pkg.name);
        const info = await GetBrewPackageInfoAsJson(pkg.name);

        const enriched: PackageEntry = {
            ...pkg,
            desc: (info["desc"] as string) || "--",
            homepage: (info["homepage"] as string) || "--",
            dependencies: (info["dependencies"] as string[]) || [],
            conflicts: (info["conflicts_with"] as string[]) || [],
        };

        setPackageCache(new Map(packageCache.set(pkg.name, enriched)));
        setSelectedPackage(enriched);
        setLoadingDetailsFor(null);
    };

    const handleRemoveConfirmed = async () => {
        if (!selectedPackage) return;
        setShowConfirm(false);
        setLoading(true);
        const result = await RemoveBrewPackage(selectedPackage.name);
        alert(result);

        const updated = await GetBrewPackages();
        const formatted = updated.map(([name, installedVersion]) => ({
            name,
            installedVersion,
        }));
        setPackages(formatted);
        setSelectedPackage(null);
        setLoading(false);
    };

    const handleUpdateConfirmed = async () => {
        if (!selectedPackage) return;
        setShowUpdateConfirm(false);
        setUpdateLogs(`Aktualisiere "${selectedPackage.name}"...\nBitte warten...`);

        const result = await UpdateBrewPackage(selectedPackage.name);
        setUpdateLogs(result);

        const updated = await GetBrewUpdatablePackages();
        const formatted = updated.map(([name, installedVersion, latestVersion]) => ({
            name,
            installedVersion,
            latestVersion,
        }));
        setUpdatablePackages(formatted);
    };

    const handleShowInfoLogs = async () => {
        if (!selectedPackage) return;

        setInfoLogs(`Hole Informationen für "${selectedPackage.name}"...\nBitte warten...`);

        // Ruft den reinen Text von brew info
        const info = await GetBrewPackageInfo(selectedPackage.name);

        // Direkt als Text setzen
        setInfoLogs(info);
    };

    return (
        <div className="wailbrew-container">
            <nav className="sidebar">
                <div className="sidebar-title">
                    <img
                        src={appIcon}
                        alt="Logo"
                        style={{
                            width: "28px",
                            height: "28px",
                            marginRight: "8px",
                            verticalAlign: "middle",
                        }}
                    />
                    WailBrew
                </div>
                <div className="sidebar-section">
                    <h4>Formeln</h4>
                    <ul>
                        <li
                            className={view === "installed" ? "active" : ""}
                            onClick={() => {
                                setView("installed");
                                setSelectedPackage(null);
                            }}
                        >
                            <span>📦 Installiert</span>
                            <span className="badge">{packages.length}</span>
                        </li>
                        <li
                            className={view === "updatable" ? "active" : ""}
                            onClick={() => {
                                setView("updatable");
                                setSelectedPackage(null);
                            }}
                        >
                            <span>🔄 Veraltet</span>
                            <span className="badge">{updatablePackages.length}</span>
                        </li>
                        <li>
                            <span>📚 Alle Formeln (tbd)</span>
                            <span className="badge"></span>
                        </li>
                        <li>
                            <span>🍃 Blätter (tbd)</span>
                            <span className="badge"></span>
                        </li>
                        <li>
                            <span>📂 Repositorys (tbd)</span>
                            <span className="badge"></span>
                        </li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <h4>Werkzeuge</h4>
                    <ul>
                        <li><span>🩺 Doctor</span></li>
                        <li><span>⬆️ Aktualisieren</span></li>
                    </ul>
                </div>
                <div style={{ marginTop: "20px", marginBottom: "10px", fontSize: "10px", color: "#777", paddingTop: "1px" }}>
                    Version {appVersion}
                </div>
            </nav>

            <main className="content">
                <div className="header-row">
                    <div className="header-title">
                        <h3>
                            {view === "installed"
                                ? `Installierte Formeln (${packages.length})`
                                : `Veraltete Formeln (${updatablePackages.length})`}
                        </h3>
                    </div>

                    <div className="header-actions">
                        {selectedPackage && (
                            <>
                                {view === "installed" && (
                                    <>
                                        <button
                                            className="trash-button"
                                            onClick={() => setShowConfirm(true)}
                                            title={`"${selectedPackage.name}" deinstallieren`}
                                        >
                                            ❌️
                                        </button>
                                        <button
                                            className="trash-button"
                                            onClick={handleShowInfoLogs}
                                            title={`Infos zu "${selectedPackage.name}" anzeigen`}
                                        >
                                            ℹ️
                                        </button>
                                    </>
                                )}
                                {view === "updatable" && (
                                    <>
                                        <button
                                            className="trash-button"
                                            onClick={() => setShowUpdateConfirm(true)}
                                            title={`"${selectedPackage.name}" aktualisieren`}
                                        >
                                            🔄
                                        </button>
                                        <button
                                            className="trash-button"
                                            onClick={handleShowInfoLogs}
                                            title={`Infos zu "${selectedPackage.name}" anzeigen`}
                                        >
                                            ℹ️
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <div className="search-container">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Suchen"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <span
                                className="clear-icon"
                                onClick={() => setSearchQuery("")}
                                title="Suche zurücksetzen"
                            >
        ✕
      </span>
                        )}
                    </div>
                </div>

                {error && <div className="result error">{error}</div>}

                <div className="table-container">
                    {loading && (
                        <div className="table-loading-overlay">
                            <div className="spinner"></div>
                            <div className="loading-text">Formeln werden geladen…</div>
                        </div>
                    )}

                    {filteredPackages.length > 0 && (
                        <table className="package-table">
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>Version</th>
                                {view === "updatable" && <th>Aktuellste Version</th>}
                            </tr>
                            </thead>
                            <tbody>
                            {filteredPackages.map((pkg) => (
                                <tr
                                    key={pkg.name}
                                    className={selectedPackage?.name === pkg.name ? "selected" : ""}
                                    onClick={() => handleSelect(pkg)}
                                >
                                    <td>{pkg.name}</td>
                                    <td>{pkg.installedVersion}</td>
                                    {view === "updatable" && <td>{pkg.latestVersion}</td>}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}

                    {!loading && filteredPackages.length === 0 && (
                        <div className="result">Keine passenden Ergebnisse.</div>
                    )}
                </div>

                <div className="info-footer-container">
                    <div className="package-info">
                        <p>
                            <strong>{selectedPackage?.name || "Kein Paket ausgewählt"}</strong>{" "}
                            {loadingDetailsFor === selectedPackage?.name && (
                                <span style={{ fontSize: "12px", color: "#888" }}>
                                    (Lade…)
                                </span>
                            )}
                        </p>
                        <p>Beschreibung: {selectedPackage?.desc || "--"}</p>
                        <p>Homepage: {selectedPackage?.homepage || "--"}</p>
                        <p>Version: {selectedPackage?.installedVersion || "--"}</p>
                        <p>Abhängigkeiten: {selectedPackage?.dependencies?.join(", ") || "--"}</p>
                        <p>Konflikte: {selectedPackage?.conflicts?.join(", ") || "--"}</p>
                    </div>
                    <div className="package-footer">
                        {view === "installed" && "Diese Formeln sind bereits auf Ihrem System installiert."}
                        {view === "updatable" && "Einige Formeln können aktualisiert werden."}
                    </div>
                </div>

                {showConfirm && (
                    <div className="confirm-overlay">
                        <div className="confirm-box">
                            <p>Möchten Sie <strong>{selectedPackage?.name}</strong> wirklich deinstallieren?</p>
                            <div className="confirm-actions">
                                <button onClick={handleRemoveConfirmed}>Ja, deinstallieren</button>
                                <button onClick={() => setShowConfirm(false)}>Abbrechen</button>
                            </div>
                        </div>
                    </div>
                )}

                {showUpdateConfirm && (
                    <div className="confirm-overlay">
                        <div className="confirm-box">
                            <p>Möchten Sie <strong>{selectedPackage?.name}</strong> wirklich aktualisieren?</p>
                            <div className="confirm-actions">
                                <button onClick={handleUpdateConfirmed}>Ja, aktualisieren</button>
                                <button onClick={() => setShowUpdateConfirm(false)}>Abbrechen</button>
                            </div>
                        </div>
                    </div>
                )}

                {updateLogs && (
                    <div className="confirm-overlay">
                        <div className="confirm-box" style={{ maxWidth: "700px" }}>
                            <p><strong>Update-Logs für {selectedPackage?.name}</strong></p>
                            <pre>{updateLogs}</pre>
                            <div className="confirm-actions">
                                <button onClick={() => setUpdateLogs(null)}>Ok</button>
                            </div>
                        </div>
                    </div>
                )}

                {infoLogs && (
                    <div className="confirm-overlay">
                        <div className="confirm-box" style={{ maxWidth: "700px" }}>
                            <p><strong>Info für {selectedPackage?.name}</strong></p>
                            <pre className="log-output">{infoLogs}</pre>
                            <div className="confirm-actions">
                                <button onClick={() => setInfoLogs(null)}>Ok</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default WailBrewApp;
