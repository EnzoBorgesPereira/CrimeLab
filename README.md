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
