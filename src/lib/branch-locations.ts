export const BRANCH_LOCATIONS: Record<string, { state: string; branches: string[] }> = {
  Mumbai: {
    state: "Maharashtra",
    branches: [
      "Andheri Branch", "Borivali Branch", "Bandra Branch", "Dadar Branch",
      "Thane Branch", "Navi Mumbai Branch", "Kurla Branch", "Malad Branch",
      "Kandivali Branch", "Goregaon Branch",
    ],
  },
  Delhi: {
    state: "Delhi",
    branches: [
      "Connaught Place Branch", "Rohini Branch", "Dwarka Branch", "Laxmi Nagar Branch",
      "Janakpuri Branch", "Pitampura Branch", "Saket Branch", "Nehru Place Branch",
    ],
  },
  Bangalore: {
    state: "Karnataka",
    branches: [
      "Koramangala Branch", "Indiranagar Branch", "Whitefield Branch", "Jayanagar Branch",
      "Marathahalli Branch", "Electronic City Branch", "Rajajinagar Branch", "Hebbal Branch",
    ],
  },
  Chennai: {
    state: "Tamil Nadu",
    branches: [
      "Anna Nagar Branch", "T Nagar Branch", "Adyar Branch", "Velachery Branch",
      "Tambaram Branch", "Porur Branch", "Nungambakkam Branch",
    ],
  },
  Hyderabad: {
    state: "Telangana",
    branches: [
      "Banjara Hills Branch", "Jubilee Hills Branch", "Madhapur Branch", "Secunderabad Branch",
      "Kukatpally Branch", "Dilsukhnagar Branch", "Ameerpet Branch",
    ],
  },
  Pune: {
    state: "Maharashtra",
    branches: [
      "Koregaon Park Branch", "Kothrud Branch", "Wakad Branch", "Hadapsar Branch",
      "Viman Nagar Branch", "Pimpri Branch", "Aundh Branch",
    ],
  },
  Kolkata: {
    state: "West Bengal",
    branches: [
      "Park Street Branch", "Salt Lake Branch", "Howrah Branch", "Dum Dum Branch",
      "Ballygunge Branch", "Behala Branch", "New Town Branch",
    ],
  },
  Gurgaon: {
    state: "Haryana",
    branches: [
      "Sector 14 Branch", "Sector 29 Branch", "DLF Phase 1 Branch", "Sohna Road Branch",
      "Golf Course Road Branch", "MG Road Branch", "Udyog Vihar Branch",
    ],
  },
  Noida: {
    state: "Uttar Pradesh",
    branches: [
      "Sector 18 Branch", "Sector 62 Branch", "Greater Noida Branch", "Sector 15 Branch",
      "Sector 44 Branch", "Sector 63 Branch",
    ],
  },
  Ahmedabad: {
    state: "Gujarat",
    branches: [
      "CG Road Branch", "Navrangpura Branch", "Satellite Branch", "Vastrapur Branch",
      "Maninagar Branch", "Bopal Branch",
    ],
  },
  Jaipur: {
    state: "Rajasthan",
    branches: [
      "MI Road Branch", "Vaishali Nagar Branch", "Malviya Nagar Branch",
      "Tonk Road Branch", "Mansarovar Branch",
    ],
  },
}

export const CITIES = Object.keys(BRANCH_LOCATIONS).sort()
