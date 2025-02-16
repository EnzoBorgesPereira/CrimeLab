import React, { useEffect, useRef, useState } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import neo4j from "neo4j-driver";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { Coordinates } from "sigma/types";

const driver = neo4j.driver(
  "neo4j+s://neo4j.teobacher.com:7687",
  neo4j.auth.basic(import.meta.env.VITE_NEO4J_USERNAME, import.meta.env.VITE_NEO4J_PASSWORD)
);

const SigmaGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaInstanceRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log("Connexion Neo4j...");

    if (graphRef.current) {
      graphRef.current.clear(); // Vider le graphe pour éviter les doublons
    } else {
      graphRef.current = new Graph();
    }

    const session = driver.session();
    const graph = graphRef.current;

    session
      .run("MATCH (p:Person)-[u:UTILISE]->(s:Site) RETURN p.numero AS Numero, s.nom_com AS Commune, s.latitude AS Latitude, s.longitude AS Longitude")
      .then((result) => {
        console.log(` Nombre de relations: ${result.records.length}`);

        result.records.forEach((record, index) => {
          const personId = record.get("Numero").toString();
          const siteName = record.get("Commune");
          const lat = record.get("Latitude");
          const lon = record.get("Longitude");

          const siteId = `${siteName}-${index}`;

          // Ajout des personnes (s'ils n'existent pas déjà)
          if (!graph.hasNode(personId)) {
            graph.addNode(personId, {
              label: `Person ${personId}`,
              x: Math.random() * 1000, // Position aléatoire initiale
              y: Math.random() * 1000,
              size: 10,
              color: "#3498db",
            });
          }

          // Ajout des sites avec leur localisation GPS
          if (!graph.hasNode(siteId) && lat !== null && lon !== null) {
            graph.addNode(siteId, {
              label: siteName,
              x: lon * 100, // Ajustement des coordonnées GPS
              y: -lat * 100, // Inversion de latitude pour correspondre à l'affichage classique
              size: 15,
              color: "#2ecc71",
            });
          }

          // Ajout de la relation entre la personne et le site
          if (!graph.hasEdge(personId, siteId)) {
            graph.addEdge(personId, siteId, {
              label: "UTILISE",
              size: 3,
              color: "#e74c3c",
            });
          }
        });

        console.log("Application du layout ForceAtlas2...");
        forceAtlas2.assign(graph, { iterations: 100 });

        if (sigmaInstanceRef.current) {
          sigmaInstanceRef.current.kill();
          console.log("🗑️ Ancienne instance Sigma supprimée");
        }

        const sigmaInstance = new Sigma(graph, containerRef.current as HTMLElement);
        sigmaInstanceRef.current = sigmaInstance;
        console.log("🎨 Sigma initialisé");

        sigmaInstance.getCamera().animatedReset();
        sigmaInstance.getCamera().enable();

        // Drag & Drop d'un nœud seul
        let draggedNode: string | null = null;
        let isDragging = false;

        sigmaInstance.on("downNode", ({ node }) => {
          draggedNode = node;
          isDragging = true;
          graph.setNodeAttribute(node, "color", "#e74c3c");
          sigmaInstance.getCamera().disable();
        });

        sigmaInstance.getMouseCaptor().on("mousemove", (event) => {
          if (draggedNode && isDragging) {
            const newPos: Coordinates = sigmaInstance.viewportToGraph(event);
            graph.setNodeAttribute(draggedNode, "x", newPos.x);
            graph.setNodeAttribute(draggedNode, "y", newPos.y);
          }
        });

        sigmaInstance.getMouseCaptor().on("mouseup", () => {
          if (draggedNode) {
            graph.setNodeAttribute(draggedNode, "color", "#3498db");
          }
          draggedNode = null;
          isDragging = false;
          sigmaInstance.getCamera().enable();
        });

        sigmaInstance.getMouseCaptor().on("mouseleave", () => {
          draggedNode = null;
          isDragging = false;
          sigmaInstance.getCamera().enable();
        });
      })
      .catch((error) => console.error(" Erreur Neo4j:", error))
      .finally(() => session.close());

    return () => {
      if (sigmaInstanceRef.current) {
        sigmaInstanceRef.current.kill();
        console.log("🧹 Nettoyage Sigma à la fermeture");
      }
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Graph Neo4j avec Sigma.js</h1>
      <div
        ref={containerRef}
        id="viz-container"
        style={{
          width: "1000px",
          height: "700px",
          border: "1px solid #ccc",
          backgroundColor: "#fff",
        }}
      >
        Chargement...
      </div>
    </div>
  );
};

export default SigmaGraph;