# CrimeLab

Projet CrimeLab basé sur Neo4j, MangoDB et un langage de programmation

```shell
npm init
```

Extention pour node.js

```shell
npm install mongoose
```

```shell
npm install neo4j-driver
```

```shell
npm install express dotenv nodemon
```

## Groupe - 3

- BORGES PEREIRA Enzo
- BACHER Téo

## Roadmap

- [x] Clean les datas CSV => ne pas importer les colonnes inutiles.
- [ ] Impoter les données de `2024_T2_sites_Metropole.csv` dans MongoDB.
- [ ] Créer un set de fake data pour interagir avec les données des antennes. => facture téléphone (appel, sms, data).
  - [ ] Créer une affaires.
  - [ ] Créer des individus.
  - [ ] Créer des lieux.
  - [ ] Créer des temoinages
  - [ ] Créer des appels entre les individus.

## Question

- Une seule affaire avec des individus, appel, lieux (=> l'appel est lié à un lieu avec les coordonnées).
- Intéractif ou statique ?
- Comment on va gérer les appels entre les individus ?
- Comment on affiche les données ?

## Set up Neo4j on vps
Génère de nouveaux certificats avec Let’s Encrypt :
``` shell
sudo certbot certonly --standalone -d neo4j.teobacher.com
```
Crée un nouveau conteneur en montant directement les fichiers de certificats :
```shell
sudo docker run -d \
  --name neo4j \
  -p 7474:7474 \
  -p 7473:7473 \
  -p 7687:7687 \
  -v /etc/letsencrypt/live/neo4j.teobacher.com/privkey.pem:/certs/privkey.pem \
  -v /etc/letsencrypt/live/neo4j.teobacher.com/fullchain.pem:/certs/fullchain.pem \
  -e NEO4J_AUTH=neo4j/testpassword \
  neo4j:5.26
  ```	
  Accède au conteneur :
```shell
sudo docker exec -it neo4j bash
```
Modifie le fichier neo4j.conf pour activer HTTPS :
```shell
server.https.enabled=true
server.http.enabled=false
server.bolt.tls_level=REQUIRED
server.bolt.enabled=true

dbms.ssl.policy.https.enabled=true
dbms.ssl.policy.https.base_directory=/certs
dbms.ssl.policy.https.private_key=privkey.pem
dbms.ssl.policy.https.certificate=fullchain.pem

dbms.ssl.policy.bolt.enabled=true
dbms.ssl.policy.bolt.base_directory=/certs
dbms.ssl.policy.bolt.private_key=privkey.pem
dbms.ssl.policy.bolt.certificate=fullchain.pem
```
Crée le lien symbolique dans /certs :
```shell
ln -s /certs/fullchain.pem /certs/public.crt
exit
```
Redémarre Neo4j : 
```shell
sudo docker restart neo4j
```

