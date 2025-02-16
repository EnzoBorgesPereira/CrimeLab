import React, {useRef, useState } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import neo4j from "neo4j-driver";
import forceAtlas2 from "graphology-layout-forceatlas2";

// Variables d'environnement pour Neo4j
const driver = neo4j.driver(
  "neo4j+s://neo4j.teobacher.com:7687",
  neo4j.auth.basic(
    import.meta.env.VITE_NEO4J_USERNAME,
    import.meta.env.VITE_NEO4J_PASSWORD
  )
);

const DynamicQuerySigmaGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaInstanceRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);

  // Requête Cypher dynamique
  const [query, setQuery] = useState<string>(
    "MATCH (p:Person)-[u:UTILISE]->(s:Site) RETURN p.numero AS Numero, s.nom_com AS Commune, s.latitude AS Latitude, s.longitude AS Longitude, type(u) AS Relation"
  );
  const [loading, setLoading] = useState<boolean>(false);

  const runQuery = () => {
    if (!containerRef.current) return;
    setLoading(true);

    // Initialisation du graphe
    if (graphRef.current) {
      graphRef.current.clear();
    } else {
      graphRef.current = new Graph();
    }
    const graph = graphRef.current;
    const session = driver.session();

    session
      .run(query)
      .then((result) => {
        console.log(`Nombre d'enregistrements: ${result.records.length}`);

        const relationCenters: Record<string, { x: number; y: number }> = {};
        let relationIndex = 0; // Index pour espacer les blocs de relations

        // Rayon pour placer les personnes autour d'une relation
        const relationRadius = 500;
        const clusterSpacing = 8000; // Espacement entre les blocs

        result.records.forEach((record) => {
          const personId = record.get("Numero").toString();
          const siteName = record.get("Commune");

          const relationLabel = record.get("Relation");

          const siteId = `site-${siteName}`;
          const relationNodeId = `rel-${relationLabel}`;

          // Si la relation n'a pas encore de position, on lui attribue un centre
          if (!relationCenters[relationNodeId]) {
            relationCenters[relationNodeId] = {
              x: relationIndex * clusterSpacing,
              y: relationIndex * clusterSpacing,
            };
            relationIndex++;
          }

          // Ajout du nœud de relation (point central du bloc)
          if (!graph.hasNode(relationNodeId)) {
            graph.addNode(relationNodeId, {
              label: relationLabel,
              x: relationCenters[relationNodeId].x,
              y: relationCenters[relationNodeId].y,
              size: 20,
              color: "#f1c40f",
            });
          }

          // Ajout du nœud Site (rattaché à la relation)
          if (!graph.hasNode(siteId)) {
            const offsetX = relationCenters[relationNodeId].x + Math.random() * 600 - 300;
            const offsetY = relationCenters[relationNodeId].y + Math.random() * 600 - 300;

            graph.addNode(siteId, {
              label: siteName,
              x: offsetX,
              y: offsetY,
              size: 25,
              color: "#2ecc71",
            });

            graph.addEdge(relationNodeId, siteId, {
              size: 2,
              color: "#e74c3c",
            });
          }

          // Ajout du nœud Personne (distribué en cercle autour du centre de relation)
          if (!graph.hasNode(personId)) {
            const angle = Math.random() * 2 * Math.PI;
            const px = relationCenters[relationNodeId].x + Math.cos(angle) * relationRadius;
            const py = relationCenters[relationNodeId].y + Math.sin(angle) * relationRadius;

            graph.addNode(personId, {
              label: `Person ${personId}`,
              x: px,
              y: py,
              size: 10,
              color: "#3498db",
            });

            graph.addEdge(personId, relationNodeId, {
              size: 2,
              color: "#e74c3c",
            });
          }
        });

        console.log("Application du layout ForceAtlas2...");

        // ForceAtlas2 amélioré pour séparer les blocs
        forceAtlas2.assign(graph, {
          iterations: 800,
          settings: {
            barnesHutOptimize: true,
            slowDown: 0.1,
            gravity: 0.2,
            scalingRatio: 5,
            adjustSizes: true,
          },
        });

        if (sigmaInstanceRef.current) {
          sigmaInstanceRef.current.kill();
          console.log("Ancienne instance Sigma supprimée");
        }

        const sigmaInstance = new Sigma(graph, containerRef.current as HTMLElement);
        sigmaInstanceRef.current = sigmaInstance;
        console.log("Sigma initialisé");

        sigmaInstance.getCamera().animatedReset();
        sigmaInstance.getCamera().enable();
      })
      .catch((error) => console.error("Erreur Neo4j:", error))
      .finally(() => {
        session.close();
        setLoading(false);
      });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Graph Dynamique avec Sigma.js</h1>
      <textarea
        style={{ width: "100%", height: "100px" }}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={runQuery} disabled={loading}>
        {loading ? "Chargement..." : "Exécuter la requête"}
      </button>
      <div
        ref={containerRef}
        id="viz-container"
        style={{
          width: "1200px",
          height: "800px",
          border: "1px solid #ccc",
          backgroundColor: "#fff",
          marginTop: "20px",
        }}
      >
        Chargement du graphe...
      </div>
    </div>
  );
};

export default DynamicQuerySigmaGraph;