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

  // Requête par défaut
  const [query] = useState<string>(
    "MATCH (p:Person)-[u:UTILISE]->(s:Site) RETURN p.numero AS Numero, s.nom_com AS Commune, s.latitude AS Latitude, s.longitude AS Longitude, type(u) AS Relation LIMIT 50"
  );
  const [loading, setLoading] = useState<boolean>(false);

  const runQuery = (cypher?: string) => {
    if (!containerRef.current) return;
    setLoading(true);

    const actualQuery = cypher || query;

    // On utilise ou crée le graphe
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

        // On fait des cas selon la requête
        if (actualQuery.includes("COMMUNIQUE_AVEC")) {
          // Cas MATCH (p:Person)-[r:COMMUNIQUE_AVEC]->(q:Person) RETURN p, r, q
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
                size: 15, // nœud plus grand
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
          // Cas par défaut => Person -> REL -> Site
          result.records.forEach((record) => {
            const personId = record.get("Numero")?.toString();
            const siteName = record.get("Commune");
            const relationLabel = record.get("Relation");
            if (!personId || !siteName || !relationLabel) return;

            const pNodeId = `Person-${personId}`;
            const sNodeId = `Site-${siteName}`;
            const relNodeId = `Rel-${pNodeId}-${sNodeId}`;

            // Person
            if (!graph.hasNode(pNodeId)) {
              graph.addNode(pNodeId, {
                label: `Person ${personId}`,
                x: Math.random() * 800,
                y: Math.random() * 800,
                color: "#3498db",
                size: 15,
              });
            }

            // Site
            if (!graph.hasNode(sNodeId)) {
              graph.addNode(sNodeId, {
                label: siteName,
                x: Math.random() * 800,
                y: Math.random() * 800,
                color: "#2ecc71",
                size: 18,
              });
            }

            // Relation (nœud intermédiaire)
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

            // Arêtes
            if (!graph.hasEdge(pNodeId, relNodeId)) {
              graph.addEdge(pNodeId, relNodeId, { color: "#e74c3c", size: 2 });
            }
            if (!graph.hasEdge(relNodeId, sNodeId)) {
              graph.addEdge(relNodeId, sNodeId, { color: "#e74c3c", size: 2 });
            }
          });
        }

        // Application du layout ForceAtlas2
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

        // Drag & Drop
        let draggedNode: string | null = null;
        let isDragging = false;

        sigmaInstance.on("downNode", ({ node }) => {
          draggedNode = node;
          isDragging = true;
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
          if (draggedNode) {
            graph.setNodeAttribute(draggedNode, "color", "#2ecc71");
          }
          draggedNode = null;
          isDragging = false;
          sigmaInstance.getCamera().enable();
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

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>CrimeLab</h1>

      <div style={styles.buttonBar}>
        <button onClick={() => runQuery()} disabled={loading} style={styles.button}>
          {loading ? "Chargement..." : "Utilise"}
        </button>

        <button
          onClick={() =>
            runQuery("MATCH (p:Person)-[r:COMMUNIQUE_AVEC]->(q:Person) RETURN p, r, q LIMIT 50")
          }
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Chargement..." : "Communique avec"}
        </button>

        <button
          onClick={() => runQuery("MATCH (n:Site) RETURN n LIMIT 50")}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Chargement..." : "Liste des sites"}
        </button>
      </div>

      <div ref={containerRef} style={styles.graphContainer} />
    </div>
  );
};

// Quelques styles inline pour une meilleure présentation
const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
    padding: "20px",
  },
  title: {
    marginBottom: "20px",
    color: "#333",
    textAlign: "center",
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
    border: "1px solid #ccc",
    backgroundColor: "#eee",
    cursor: "pointer",
  },
  textarea: {
    width: "100%",
    height: "80px",
    marginTop: "10px",
    resize: "vertical",
    fontFamily: "monospace",
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #ccc",
  },
  submitButton: {
    marginTop: "10px",
    padding: "10px 15px",
    borderRadius: "4px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  graphContainer: {
    width: "1200px",
    height: "800px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "#fff",
    margin: "20px auto",
  },
};

export default DynamicMultiQueryGraph;