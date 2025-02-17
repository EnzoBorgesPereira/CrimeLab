import express from 'express';
import { exec } from 'child_process';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

app.post('/api/import', (req, res) => {
  const affaire = req.query.affaire || 'a_001';
  const command = `node -r dotenv/config ../data/import/import_neo4j_all.js ${affaire}`;
  
  exec(command, { env: process.env, }, (error, stdout, stderr) => {
    if (error) {
      console.error('Erreur lors de l\'exécution du script :', error);
      res.status(500).json({ message: 'Erreur d\'importation', error: error.message });
    } else {
      console.log('Résultat du script :', stdout);
      res.json({ message: `Import pour l'affaire ${affaire} terminé.`, output: stdout });
    }
  });
});

app.listen(3001, () => {
  console.log('API démarrée sur le port 3001.');
});
