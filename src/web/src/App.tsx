import React, { useRef, useState } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import neo4j from "neo4j-driver";
import forceAtlas2 from "graphology-layout-forceatlas2";

// Création du driver Neo4j
const driver = neo4j.driver(
  "neo4j+s://neo4j.teobacher.com:7687",
  neo4j.auth.basic(
    import.meta.env.VITE_NEO4J_USERNAME,
    import.meta.env.VITE_NEO4J_PASSWORD
  )
);

type NodeData = {
  label: string;
  color?: string;
  x?: number;
  y?: number;
  size?: number; // taille du nœud
};

type EdgeData = {
  label?: string;
  color?: string;
  size?: number;
};

const DynamicMultiQueryGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaInstanceRef = useRef<Sigma<NodeData, EdgeData> | null>(null);
  const graphRef = useRef<Graph<NodeData, EdgeData> | null>(null);
  const [isImported, setIsImported] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  // Requête par défaut
  const [query] = useState<string>(
    "MATCH (p:Person)-[u:UTILISE]->(s:Site) RETURN p.numero AS Numero, s.nom_com AS Commune, s.latitude AS Latitude, s.longitude AS Longitude, type(u) AS Relation"
  );
  const [loading, setLoading] = useState<boolean>(false);

  const [selectedAffaire, setSelectedAffaire] = useState("a_001");

  // MODAL: états simples
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeProps, setSelectedNodeProps] = useState<Record<string, any>>({});

  const clearGraph = () => {
    if (graphRef.current) {
      graphRef.current.clear(); // Vider les nœuds et arêtes
    }

    if (sigmaInstanceRef.current) {
      sigmaInstanceRef.current.kill(); // Détruire l'instance Sigma
      sigmaInstanceRef.current = null;
    }
  };

  const runQuery = (cypher?: string) => {
    if (!containerRef.current) return;
    setLoading(true);
    clearGraph();

    const actualQuery = cypher || query;

    if (!graphRef.current) {
      graphRef.current = new Graph<NodeData, EdgeData>();
    } else {
      graphRef.current.clear();
    }
    const graph = graphRef.current;
    const session = driver.session();

    session
      .run(actualQuery)
      .then((result) => {
        console.log(`Nombre d'enregistrements: ${result.records.length}`);

        // Différents cas en fonction de la requête
        if (actualQuery.includes("COMMUNIQUE_AVEC")) {
          // Cas COMMUNIQUE_AVEC
          result.records.forEach((record) => {
            const p = record.get("p");
            const q = record.get("q");
            const rel = record.get("r");
            if (!p || !q || !rel) return;

            const pId = `Person-${p.identity.toString()}`;
            const qId = `Person-${q.identity.toString()}`;

            if (!graph.hasNode(pId)) {
              graph.addNode(pId, {
                label: (p.labels?.[0] || "Person") + " " + p.identity,
                x: Math.random() * 800,
                y: Math.random() * 800,
                color: "#3498db",
                size: 15,
              });
            }
            if (!graph.hasNode(qId)) {
              graph.addNode(qId, {
                label: (q.labels?.[0] || "Person") + " " + q.identity,
                x: Math.random() * 800,
                y: Math.random() * 800,
                color: "#3498db",
                size: 15,
              });
            }
            if (!graph.hasEdge(pId, qId)) {
              graph.addEdge(pId, qId, {
                label: rel.type,
                color: "#e74c3c",
                size: 2,
              });
            }
          });
        } else if (actualQuery.includes("RETURN n") || actualQuery.includes("n:Site")) {
          // Cas MATCH (n:Site) RETURN n
          result.records.forEach((record) => {
            const siteNode = record.get("n");
            if (!siteNode) return;

            const siteId = `Site-${siteNode.identity.toString()}`;
            if (!graph.hasNode(siteId)) {
              graph.addNode(siteId, {
                label: (siteNode.labels?.[0] || "Site") + " " + siteNode.identity,
                x: Math.random() * 800,
                y: Math.random() * 800,
                color: "#2ecc71",
                size: 18,
              });
            }
          });
        } else {
          // Par défaut => Person -> REL -> Site
          result.records.forEach((record) => {
            const personId = record.get("Numero")?.toString();
            const siteName = record.get("Commune");
            const relationLabel = record.get("Relation");
            if (!personId || !siteName || !relationLabel) return;

            const pNodeId = `Person-${personId}`;
            const sNodeId = `Site-${siteName}`;
            const relNodeId = `Rel-${pNodeId}-${sNodeId}`;

            if (!graph.hasNode(pNodeId)) {
              graph.addNode(pNodeId, {
                label: `Person ${personId}`,
                x: Math.random() * 800,
                y: Math.random() * 800,
                color: "#3498db",
                size: 15,
              });
            }
            if (!graph.hasNode(sNodeId)) {
              graph.addNode(sNodeId, {
                label: siteName,
                x: Math.random() * 800,
                y: Math.random() * 800,
                color: "#2ecc71",
                size: 18,
              });
            }
            if (!graph.hasNode(relNodeId)) {
              const px = graph.getNodeAttribute(pNodeId, "x") ?? Math.random() * 800;
              const py = graph.getNodeAttribute(pNodeId, "y") ?? Math.random() * 800;
              const sx = graph.getNodeAttribute(sNodeId, "x") ?? Math.random() * 800;
              const sy = graph.getNodeAttribute(sNodeId, "y") ?? Math.random() * 800;
              graph.addNode(relNodeId, {
                label: relationLabel,
                color: "#f1c40f",
                size: 12,
                x: (px + sx) / 2,
                y: (py + sy) / 2,
              });
            }
            if (!graph.hasEdge(pNodeId, relNodeId)) {
              graph.addEdge(pNodeId, relNodeId, { color: "#e74c3c", size: 2 });
            }
            if (!graph.hasEdge(relNodeId, sNodeId)) {
              graph.addEdge(relNodeId, sNodeId, { color: "#e74c3c", size: 2 });
            }
          });
        }

        // Layout ForceAtlas2
        forceAtlas2.assign(graph, {
          iterations: 500,
          settings: {
            barnesHutOptimize: true,
            slowDown: 0.2,
            gravity: 0.3,
            scalingRatio: 3,
            adjustSizes: true,
          },
        });

        // Nettoyage si Sigma existe déjà
        if (sigmaInstanceRef.current) {
          sigmaInstanceRef.current.kill();
          sigmaInstanceRef.current = null;
        }

        // Création de Sigma
        const sigmaInstance = new Sigma(graph, containerRef.current as HTMLElement);
        sigmaInstanceRef.current = sigmaInstance;
        sigmaInstance.getCamera().animatedReset();
        sigmaInstance.getCamera().enable();

        // DRAG & DROP
        let draggedNode: string | null = null;
        let draggedNodeOriginalColor: string | undefined;
        let isDragging = false;

        sigmaInstance.on("downNode", ({ node }) => {
          draggedNode = node;
          isDragging = true;
          draggedNodeOriginalColor = graph.getNodeAttribute(node, "color");
          graph.setNodeAttribute(node, "color", "#e74c3c");
          sigmaInstance.getCamera().disable();
        });

        sigmaInstance.getMouseCaptor().on("mousemove", (e) => {
          if (draggedNode && isDragging) {
            const { x, y } = sigmaInstance.viewportToGraph(e);
            graph.setNodeAttribute(draggedNode, "x", x);
            graph.setNodeAttribute(draggedNode, "y", y);
          }
        });

        sigmaInstance.getMouseCaptor().on("mouseup", () => {
          if (draggedNode && draggedNodeOriginalColor) {
            graph.setNodeAttribute(draggedNode, "color", draggedNodeOriginalColor);
          }
          draggedNode = null;
          isDragging = false;
          sigmaInstance.getCamera().enable();
        });

        // MODAL: Affichage des propriétés du nœud
        sigmaInstance.on("clickNode", ({ node }) => {
          const props = graph.getNodeAttributes(node);
          setSelectedNodeId(node);
          setSelectedNodeProps(props);
          setModalOpen(true);
        });
      })
      .catch((error) => {
        console.error("Erreur Neo4j:", error);
      })
      .finally(() => {
        session.close();
        setLoading(false);
      });
  };

  const handleImport = async () => {
    clearGraph();
    setIsImporting(true);
    setIsImported(false);

    try {
      await fetch(`http://localhost:3001/api/import?affaire=${selectedAffaire}`, { method: "POST" });
      setIsImported(true);
    } catch (error) {
      console.error("Erreur lors de l'import :", error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>CrimeLab</h1>
      <div style={styles.authors}>
        Réalisé par : Enzo Borges Pereira &amp; Téo Bacher
      </div>

      {/* Contrôles alignés */}
      <div style={styles.controls}>
        <label htmlFor="affaireSelect">Sélectionner une affaire :</label>
        <select
          id="affaireSelect"
          value={selectedAffaire}
          onChange={(e) => {
            setSelectedAffaire(e.target.value);
            setIsImported(false);
            clearGraph();
          }}
          style={styles.dropdown}
        >
          <option value="a_001">Affaire a_001</option>
          <option value="a_002">Affaire a_002</option>
        </select>
        <button
          onClick={handleImport}
          disabled={isImporting}
          style={isImporting ? { ...styles.button, ...styles.disabledButton } : styles.button}
        >
          {isImporting ? "Importation en cours..." : "Importer"}
        </button>
      </div>

      <div style={styles.buttonBar}>
        <button
          onClick={() => runQuery()}
          disabled={loading || !isImported}
          style={loading || !isImported ? { ...styles.button, ...styles.disabledButton } : styles.button}
        >
          {loading ? "Chargement..." : "Utilise"}
        </button>

        <button
          onClick={() => runQuery("MATCH (p:Person)-[r:COMMUNIQUE_AVEC]->(q:Person) RETURN p, r, q LIMIT 50")}
          disabled={loading || !isImported}
          style={loading || !isImported ? { ...styles.button, ...styles.disabledButton } : styles.button}
        >
          {loading ? "Chargement..." : "Communique avec"}
        </button>

        <button
          onClick={() => runQuery("MATCH (n:Site) RETURN n LIMIT 50")}
          disabled={loading || !isImported}
          style={loading || !isImported ? { ...styles.button, ...styles.disabledButton } : styles.button}
        >
          {loading ? "Chargement..." : "Liste des sites"}
        </button>

        <button
          onClick={clearGraph}
          disabled={loading || !isImported}
          style={loading || !isImported ? { ...styles.buttonClear, ...styles.disabledButton } : styles.buttonClear}
        >
          Effacer
        </button>
      </div>

      {isImported ? (
        <div ref={containerRef} id="viz-container" style={styles.graphContainer} />
      ) : (
        <p style={styles.infoText}>
          Importez une affaire pour afficher le graphe.
        </p>
      )}

      {/* Modal pour afficher les détails d'un nœud */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>
              Détails du nœud : <span style={{ color: "#007bff" }}>{selectedNodeId}</span>
            </h3>
            <ul>
              {Object.entries(selectedNodeProps).map(([k, v]) => (
                <li key={k}>
                  <strong>{k}:</strong> {JSON.stringify(v)}
                </li>
              ))}
            </ul>
            <button style={styles.closeButton} onClick={() => setModalOpen(false)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "Arial, sans-serif",
    background: "linear-gradient(135deg, #f0f4f8, #d9e2ec)",
    minHeight: "100vh",
    padding: "20px",
  },
  title: {
    marginBottom: "10px",
    color: "#333",
    textAlign: "center",
    textShadow: "1px 1px 2px #aaa",
  },
  authors: {
    textAlign: "center",
    color: "#444",
    marginBottom: "20px",
    fontSize: "16px",
  },
  controls: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
  },
  dropdown: {
    padding: "10px 15px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  buttonBar: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
    justifyContent: "center",
  },
  button: {
    padding: "10px 15px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
  },
  buttonClear: {
    padding: "10px 15px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#ff4747",
    color: "#fff",
    cursor: "pointer",
  },
  disabledButton: {
    backgroundColor: "#aaa",
    cursor: "not-allowed",
    opacity: 0.7,
  },
  graphContainer: {
    width: "1200px",
    height: "800px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "#fff",
    margin: "20px auto",
    boxShadow: "0px 2px 10px rgba(0,0,0,0.1)",
  },
  infoText: {
    textAlign: "center",
    fontSize: "18px",
    color: "#666",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "4px",
    minWidth: "300px",
    maxWidth: "60%",
  },
  closeButton: {
    marginTop: "10px",
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default DynamicMultiQueryGraph;