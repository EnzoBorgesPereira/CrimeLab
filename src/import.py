import csv
from neo4j import GraphDatabase

def import_data(csv_file, uri, user, password):
    driver = GraphDatabase.driver(uri, auth=(user, password))
    with driver.session() as session:
        with open(csv_file, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                query = """
                CREATE (s:Site {
                    code_op: $code_op,
                    nom_op: $nom_op,
                    num_site: $num_site,
                    id_site_partage: $id_site_partage,
                    id_station_anfr: $id_station_anfr,
                    x: $x,
                    y: $y,
                    latitude: $latitude,
                    longitude: $longitude,
                    nom_reg: $nom_reg,
                    nom_dep: $nom_dep,
                    insee_dep: $insee_dep,
                    nom_com: $nom_com,
                    insee_com: $insee_com,
                    site_2g: $site_2g,
                    site_3g: $site_3g,
                    site_4g: $site_4g,
                    site_5g: $site_5g,
                    mes_4g_trim: $mes_4g_trim,
                    site_ZB: $site_ZB,
                    site_DCC: $site_DCC,
                    site_strategique: $site_strategique,
                    site_capa_240mbps: $site_capa_240mbps,
                    date_ouverturecommerciale_5g: $date_ouverturecommerciale_5g,
                    site_5g_700_m_hz: $site_5g_700_m_hz,
                    site_5g_800_m_hz: $site_5g_800_m_hz,
                    site_5g_1800_m_hz: $site_5g_1800_m_hz,
                    site_5g_2100_m_hz: $site_5g_2100_m_hz,
                    site_5g_3500_m_hz: $site_5g_3500_m_hz
                })
                """
                session.run(query, row)
    driver.close()

if __name__ == "__main__":
    import_data(
        "/Users/enzoborges/Desktop/ESGI/3AL/S1/BDD NoSQL/CrimeLab/data/2024_T2_sites_Metropole.csv",
        "neo4j://localhost:7687",
        "neo4j",
        "password"
    )
