import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Manually transcribed published values. No interpolation or regional adjustment.
const source = "data/knowledge/germany_living_space_per_capita.json";
const sources = [
  { id: "uba_2003", title: "Berücksichtigung von Umweltgesichtspunkten bei Subventionen – Sektorstudie Wohnungsbau", publisher: "Umweltbundesamt / ifo", year: 2003, url: "https://www.umweltbundesamt.de/sites/default/files/medien/publikation/long/2341.pdf" },
  { id: "destatis_1990", title: "35 Jahre Deutsche Einheit", publisher: "Statistisches Bundesamt", year: 2025, url: "https://www.destatis.de/DE/Themen/Querschnitt/35-Jahre-Deutsche-Einheit/_inhalt.html" },
  { id: "destatis_2003", title: "Bestand an Wohnungen 2003 – Fachserie 5 Reihe 3", publisher: "Statistisches Bundesamt", year: 2004, url: "https://www.statistischebibliothek.de/mir/servlets/MCRFileNodeServlet/DEHeft_derivate_00005698/2050300037004.pdf" },
  { id: "destatis_2016", title: "Bestand an Wohnungen 2016 – Fachserie 5 Reihe 3", publisher: "Statistisches Bundesamt", year: 2017, url: "https://www.statistischebibliothek.de/mir/servlets/MCRFileNodeServlet/DEHeft_derivate_00033055/2050300167004.pdf" },
  { id: "destatis_2026", title: "Wohnungsbestand im Zeitvergleich / GENESIS 31231-0001", publisher: "Statistisches Bundesamt", year: 2026, url: "https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Wohnen/Tabellen/liste-wohnungsbestand.html" }
];
const provenance = (id, file, locator, extraction) => ({ sourceFile: file, sourceUrl: sources.find(source => source.id === id).url, locator, fields: ["Jahr / Stichtag", "Wohnfläche je Person / Einwohner (m²)"], extraction, transformation: "Keine Interpolation, Glättung, Niveauverschiebung oder pauschale West-Ost-Korrektur; publizierte Werte unverändert." });
const west = [[1950,15],[1960,19.4],[1968,23.8],[1972,26.4],[1978,31.1],[1982,33.6],[1987,35.5],[1988,36.9],[1989,36.7]];
const national = [34.8,34.9,35.1,35.4,36.2,36.7,37.2,37.9,38.4,39,39.5,39.8,40.1,40.5,40.8,41.2,41.6,41.9,42.2,42.5,45,46.1,46.2,46.3,46.5,46.2,46.3,46.5,46.7,47,47.4,47.7,48.9,49,49.2,49.5];
const point = (year,value,id) => ({ year,value,display: `${value.toFixed(1).replace(".",",")} m²/Person`,sourceRefs:[id] });
const observations = [...west.map(([year,value])=>point(year,value,"uba_2003")), ...national.map((value,index)=>{
  const year = 1990+index;
  return point(year,value,year===1990?"destatis_1990":year<=2003?"destatis_2003":year<=2014?"destatis_2016":"destatis_2026");
})];
const breaks = [
  [1990,"Gebietswechsel: früheres Bundesgebiet → Gesamtdeutschland","West 1990: 36,4 m²; Gesamtdeutschland: 34,8 m². Differenz 1,6 m² (4,4 % des Westwertes); keine rechnerische Anpassung früherer Werte."],
  [1994,"Neue Zählungsgrundlage im Osten","Ab Berichtsjahr 1994 basieren die ostdeutschen Bestandsergebnisse auf der Gebäude- und Wohnungszählung 1995; davor Zählung 1981. Der Sprung ist nicht als reiner Zuwachs zu lesen."],
  [2010,"Zensus 2011: neue Wohnungsgrundlage","Die veröffentlichte Reihe verwendet ab 2010 die Gebäude- und Wohnungszählung 2011 einschließlich Wohnheimen. Bis 2009 sind Wohnheime nicht enthalten; keine Verbindung über den Methodenwechsel."],
  [2011,"Zensus 2011: Bevölkerungsgrundlage","Zusätzlich zur neuen Wohnungsgrundlage ändert sich die Bevölkerungsgrundlage durch den Zensus 2011. Die Veränderung pro Kopf umfasst statistische Revisionen."],
  [2022,"Neue Grundlage: Zensus 2022","Ab 2022 Fortschreibung auf Basis der Gebäude- und Wohnungszählung 2022 sowie der neuen Bevölkerungsgrundlage. 47,7 → 48,9 m² enthält einen Methodenwechsel."]
].map(([year,label,detail])=>({year,label,detail,showValues:true,showMarker:true}));
const definitions = [
  ["west","Früheres Bundesgebiet · historische Statistik",1950,1989,["uba_2003"],provenance("uba_2003","2341.pdf","Tabelle 2.2-1, gedruckte S. 7 / PDF-S. 23; Zeilen 1950–1989; Fußnote zum Gebietsstand.","Neun veröffentlichte Stützwerte. Angaben ab 1990 dieser Tabelle werden wegen abweichender Werte nicht übernommen.")],
  ["germany_old","Gesamtdeutschland · alte Zählungsgrundlagen",1990,1993,["destatis_1990","destatis_2003"],provenance("destatis_2003","2050300037004.pdf","Tabelle 1.1, PDF-S. 5, Zeilen Deutschland 1991–1993; Methodik PDF-S. 3. 1990 separat aus Destatis: 35 Jahre Deutsche Einheit, Abschnitt Wohnfläche pro Kopf steigt.","1990: 34,8; 1991: 34,9; 1992: 35,1; 1993: 35,4 m²/Einwohner.")],
  ["germany_1995","Gesamtdeutschland · GWZ 1987/1995",1994,2009,["destatis_2003","destatis_2016"],provenance("destatis_2003","2050300037004.pdf / 2050300167004.pdf","2003: Tabelle 1.1, PDF-S. 5, Deutschland 1994–2003, Fußnote 1 und Methodik PDF-S. 3. 2016: Tabelle 1.1, PDF-S. 6, Deutschland 2004–2009.","16 publizierte Jahreswerte; zweite Fundstelle: https://www.statistischebibliothek.de/mir/servlets/MCRFileNodeServlet/DEHeft_derivate_00033055/2050300167004.pdf")],
  ["germany_2010","Gesamtdeutschland · revidierter Bestand 2010",2010,2010,["destatis_2016"],provenance("destatis_2016","2050300167004.pdf","Tabelle 1.1, PDF-S. 6, Deutschland 2010, Fußnote 1.","45,0 m²; einzelner belegter Punkt, kein künstlicher Anschluss.")],
  ["germany_2011","Gesamtdeutschland · Zensus 2011",2011,2021,["destatis_2016","destatis_2026"],provenance("destatis_2016","2050300167004.pdf / GENESIS 31231-0001","Tabelle 1.1, PDF-S. 6, Deutschland 2011–2014. 2015–2021: aktuelle GENESIS-Tabelle 31231-0001, Wohnfläche je Einwohner.","2011–2014 aus Fachserie; 2015–2021 aus aktuellem GENESIS-Stand, einschließlich revidiertem Wert 2016 = 46,3 statt 46,5 in der Ausgabe 2016.")],
  ["germany_2022","Gesamtdeutschland · Zensus 2022",2022,2025,["destatis_2026"],provenance("destatis_2026","GENESIS 31231-0001","Wohnungsbestand im Zeitvergleich, Deutschland; Zeile Wohnfläche je Einwohner, Spalten 2022–2025, Fußnote 2; Stand 16.07.2026.","48,9 / 49,0 / 49,2 / 49,5 m²/Einwohner.")]
];
const observationSegments = definitions.map(([id,label,start,end,sourceRefs,provenance])=>({id,label,period:`${start}–${end}`,method:breaks.find(marker=>marker.year===start)?.detail || "Historische amtliche Wohnflächenstatistik; bis 1989 ausschließlich früheres Bundesgebiet.",sourceRefs,provenance,points:observations.filter(point=>point.year>=start&&point.year<=end)}));
const displayObservations = observationSegments.flatMap(segment=>{
  let last=-Infinity;
  return segment.points.filter((point,index)=>{
    if(index===0 || index===segment.points.length-1 || point.year-last>=5){last=point.year;return true;} return false;
  });
});
const curve = {
  curveId:`knowledge:${source}#germany_living_space_per_capita_1950_2025`, seriesId:"germany_living_space_per_capita_1950_2025",source,
  domainType:"influence_area",domainId:"eah_tech_social_environment",domainLabel:"Technologische & soziale Umwelt",curveRole:"deep_dive",
  label:"Wohnfläche je Einwohner · Deutschland",metric:"Verfügbare Wohnfläche des Wohnungsbestands pro Einwohner; bis 1989 früheres Bundesgebiet",unit:"m²/Person",geography:"Früheres Bundesgebiet bis 1989; Gesamtdeutschland ab 1990",dataNature:"observed",worseningDirection:"increase",
  finding:"Amtliche Bestandskennzahl zur Wohnflächenentwicklung; keine Aussage über Verteilung oder individuelle Wohnversorgung.",
  uncertainty:"Frühe Werte nur für das frühere Bundesgebiet. Gebiets- und Methodenwechsel werden als getrennte Statistiksegmente dargestellt. Kein gesamtdeutscher Rückschluss vor 1990; keine Zukunftsprojektion belegt.",
  methodNote:"Historische amtliche Statistik 1950–1989 und Wohnungsfortschreibung 1990–2025. Wohnungsbestand geteilt durch Bevölkerung, einschließlich Leerstand; vor 2010 ohne Wohnheime. Linien verbinden nur Werte innerhalb desselben Statistiksegments. Keine West-Ost-Korrektur oder Interpolation.",
  observationCoverage:{startYear:1950,endYear:2025},observationSourceRefs:sources.map(source=>source.id),observationProvenance:observationSegments.at(-1).provenance,
  observations,displayObservations,observationSegments,methodBreaks:breaks,
  historicalReconstruction:[],displayHistoricalReconstruction:[],projections:[],displayProjections:[],
  reference:{type:"no_planetary_threshold",display:"Für Wohnfläche pro Kopf ist hier kein belastbarer planetarer Grenzwert definiert."},
  thresholdAssessments:Object.fromEntries(["boundary","highRisk"].map(kind=>[kind,{status:"not_assessable",reason:"no_planetary_threshold"}])),
  displayDerivation:{interpolation:false,transformations:[],observations:{inputPointCount:observations.length,outputPointCount:displayObservations.length,intervalYears:5,rule:"Vorhandene Werte im Abstand von mindestens fünf Jahren innerhalb eines Statistiksegments; erste und letzte Werte sowie beide Seiten aller Methodenwechsel bleiben sichtbar. Keine Linienverbindung zwischen Segmenten."}},
  contextNotes:breaks.map(marker=>({id:`housing_break_${marker.year}`,label:marker.label,value:String(marker.year),detail:marker.detail,sourceRefs:marker.year===1990?["destatis_1990"]:marker.year===2022?["destatis_2026"]:marker.year===1994?["destatis_2003"]:["destatis_2016"]})),sources
};
const payload={format:"gwl-blc-curve-export-v1",version:"1.9",manifestVersion:"blc-local-housing-2026-10-06",curves:[curve]};
payload.integrity={algorithm:"SHA-256",hash:createHash("sha256").update(JSON.stringify(payload)).digest("hex")};
await mkdir(new URL("../data/knowledge/",import.meta.url),{recursive:true});
await writeFile(new URL(`../${source}`,import.meta.url),JSON.stringify(payload,null,2)+"\n");
console.log(`Wohnflächenreihe: ${observations.length} Originalwerte, ${observationSegments.length} Statistiksegmente.`);
