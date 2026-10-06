window.BRUCHLAST_DATA = Object.freeze({
  version: "0.3.0",
  range: Object.freeze({ start: 1700, end: 2100 }),
  views: Object.freeze({
    zustand: Object.freeze({
      version: 1,
      curveIds: Object.freeze([
        "knowledge:data/knowledge/gwl_climate_change_pilot_v0.1.json#global_co2_noaa_annual",
        "knowledge:data/knowledge/gwl_freshwater_blue_green_timeseries_v0.2.json#blue_water_streamflow",
        "knowledge:data/knowledge/gwl_plastics_petrochemicals_global_v0.1.json#global_plastics_production_1950_2019",
        "knowledge:data/knowledge/gwl_climate_arctic_september_sea_ice_v0.1.json#arctic_september_sea_ice_area_1979_2024",
        "knowledge:data/knowledge/gwl_climate_temperature_global_v0.2.json#global_temperature_hadcrut5_1850_2025"
      ]),
      segments: Object.freeze({ observed: true, historical: true, projection: true })
    })
  }),
  import: Object.freeze({
    supplementalSource: "data/knowledge/germany_living_space_per_capita.json",
    source: "data/gwl/blc-curve-export-v1.json",
    format: "gwl-blc-curve-export-v1",
    version: "1.9"
  })
});
