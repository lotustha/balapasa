// Nepal Administrative Divisions — Province → District → Municipalities
// Source: Government of Nepal, Ministry of Federal Affairs

export interface Municipality {
  name: string
  type: 'महानगरपालिका' | 'उपमहानगरपालिका' | 'नगरपालिका' | 'गाउँपालिका'
  wards: number
  // Approximate centre coordinates for logistics matching
  lat?: number
  lng?: number
}

export interface District {
  name: string
  municipalities: Municipality[]
}

export interface Province {
  id: number
  name: string
  capital: string
  districts: District[]
}

export const NEPAL_PROVINCES: Province[] = [
  {
    id: 1, name: 'Koshi Province', capital: 'Biratnagar',
    districts: [
      {
        name: 'Morang',
        municipalities: [
          { name: 'Biratnagar', type: 'महानगरपालिका', wards: 19, lat: 26.4525, lng: 87.2718 },
          { name: 'Urlabari', type: 'नगरपालिका', wards: 9 },
          { name: 'Sundarharaicha', type: 'नगरपालिका', wards: 9 },
          { name: 'Letang Bhogateni', type: 'नगरपालिका', wards: 9 },
          { name: 'Belbari', type: 'नगरपालिका', wards: 9 },
          { name: 'Rangeli', type: 'नगरपालिका', wards: 9 },
          { name: 'Patahrishanishchare', type: 'नगरपालिका', wards: 9 },
          { name: 'Kanepokhari', type: 'गाउँपालिका', wards: 9 },
          { name: 'Dhanpalthan', type: 'गाउँपालिका', wards: 7 },
          { name: 'Kerabari', type: 'नगरपालिका', wards: 9 },
        ],
      },
      {
        name: 'Sunsari',
        municipalities: [
          { name: 'Inaruwa', type: 'नगरपालिका', wards: 9 },
          { name: 'Itahari', type: 'उपमहानगरपालिका', wards: 13, lat: 26.6636, lng: 87.2798 },
          { name: 'Dharan', type: 'उपमहानगरपालिका', wards: 19, lat: 26.8065, lng: 87.2847 },
          { name: 'Duhabi', type: 'नगरपालिका', wards: 9 },
          { name: 'Barahakshetra', type: 'नगरपालिका', wards: 9 },
          { name: 'Ramdhuni', type: 'नगरपालिका', wards: 9 },
          { name: 'Koshi', type: 'गाउँपालिका', wards: 7 },
          { name: 'Harinagara', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Jhapa',
        municipalities: [
          { name: 'Mechinagar', type: 'नगरपालिका', wards: 9 },
          { name: 'Bhadrapur', type: 'नगरपालिका', wards: 9 },
          { name: 'Birtamod', type: 'नगरपालिका', wards: 9 },
          { name: 'Arjundhara', type: 'नगरपालिका', wards: 9 },
          { name: 'Shivasataxi', type: 'नगरपालिका', wards: 9 },
          { name: 'Damak', type: 'नगरपालिका', wards: 9, lat: 26.6626, lng: 87.6959 },
          { name: 'Kankai', type: 'नगरपालिका', wards: 9 },
          { name: 'Gauradaha', type: 'नगरपालिका', wards: 9 },
          { name: 'Buddhashanti', type: 'गाउँपालिका', wards: 9 },
        ],
      },
      {
        name: 'Ilam',
        municipalities: [
          { name: 'Ilam', type: 'नगरपालिका', wards: 9, lat: 26.9109, lng: 87.9269 },
          { name: 'Mai', type: 'नगरपालिका', wards: 9 },
          { name: 'Suryodaya', type: 'नगरपालिका', wards: 9 },
          { name: 'Deumai', type: 'नगरपालिका', wards: 9 },
          { name: 'Maijogmai', type: 'गाउँपालिका', wards: 8 },
          { name: 'Sandakpur', type: 'गाउँपालिका', wards: 8 },
        ],
      },
      {
        name: 'Taplejung',
        municipalities: [
          { name: 'Phungling', type: 'नगरपालिका', wards: 9 },
          { name: 'Sirijangha', type: 'गाउँपालिका', wards: 8 },
          { name: 'Mikwakhola', type: 'गाउँपालिका', wards: 7 },
        ],
      },
    ],
  },
  {
    id: 2, name: 'Madhesh Province', capital: 'Janakpur',
    districts: [
      {
        name: 'Parsa',
        municipalities: [
          { name: 'Birgunj', type: 'महानगरपालिका', wards: 32, lat: 27.0078, lng: 84.8783 },
          { name: 'Pokhariya', type: 'नगरपालिका', wards: 9 },
          { name: 'Bahudarmai', type: 'नगरपालिका', wards: 9 },
          { name: 'Bindabasini', type: 'गाउँपालिका', wards: 7 },
          { name: 'Kalikamai', type: 'गाउँपालिका', wards: 8 },
        ],
      },
      {
        name: 'Dhanusha',
        municipalities: [
          { name: 'Janakpur', type: 'उपमहानगरपालिका', wards: 15, lat: 26.7288, lng: 85.9246 },
          { name: 'Kamala', type: 'नगरपालिका', wards: 9 },
          { name: 'Mithila', type: 'नगरपालिका', wards: 9 },
          { name: 'Bideha', type: 'नगरपालिका', wards: 9 },
          { name: 'Dhanusadham', type: 'नगरपालिका', wards: 9 },
          { name: 'Chhireshwornath', type: 'नगरपालिका', wards: 9 },
          { name: 'Nagarain', type: 'नगरपालिका', wards: 9 },
          { name: 'Mithila Bihari', type: 'नगरपालिका', wards: 9 },
          { name: 'Hansapur', type: 'नगरपालिका', wards: 9 },
        ],
      },
      {
        name: 'Sarlahi',
        municipalities: [
          { name: 'Malangwa', type: 'नगरपालिका', wards: 9 },
          { name: 'Barahathawa', type: 'नगरपालिका', wards: 9 },
          { name: 'Ishworpur', type: 'नगरपालिका', wards: 9 },
          { name: 'Lalbandi', type: 'नगरपालिका', wards: 9 },
          { name: 'Haripurwa', type: 'नगरपालिका', wards: 9 },
          { name: 'Haripur', type: 'नगरपालिका', wards: 9 },
          { name: 'Chakraghatta', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Mahottari',
        municipalities: [
          { name: 'Jaleshwar', type: 'नगरपालिका', wards: 9, lat: 26.6531, lng: 85.8039 },
          { name: 'Bardibas', type: 'नगरपालिका', wards: 9 },
          { name: 'Gaushala', type: 'नगरपालिका', wards: 9 },
          { name: 'Manara Shisawa', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Siraha',
        municipalities: [
          { name: 'Siraha', type: 'नगरपालिका', wards: 9, lat: 26.6529, lng: 86.2034 },
          { name: 'Lahan', type: 'नगरपालिका', wards: 9 },
          { name: 'Golbazar', type: 'नगरपालिका', wards: 9 },
          { name: 'Mirchaiya', type: 'नगरपालिका', wards: 9 },
          { name: 'Karjanha', type: 'नगरपालिका', wards: 9 },
          { name: 'Sukhipur', type: 'नगरपालिका', wards: 9 },
          { name: 'Arnama', type: 'गाउँपालिका', wards: 7 },
        ],
      },
    ],
  },
  {
    id: 3, name: 'Bagmati Province', capital: 'Hetauda',
    districts: [
      {
        name: 'Kathmandu',
        municipalities: [
          { name: 'Kathmandu', type: 'महानगरपालिका', wards: 32, lat: 27.7172, lng: 85.3240 },
          { name: 'Kirtipur', type: 'नगरपालिका', wards: 9, lat: 27.6760, lng: 85.2781 },
          { name: 'Gokarneshwar', type: 'नगरपालिका', wards: 9, lat: 27.7562, lng: 85.3765 },
          { name: 'Dakshinkali', type: 'नगरपालिका', wards: 9, lat: 27.6159, lng: 85.2478 },
          { name: 'Nagarjun', type: 'नगरपालिका', wards: 9, lat: 27.7350, lng: 85.2690 },
          { name: 'Tokha', type: 'नगरपालिका', wards: 9, lat: 27.7672, lng: 85.3166 },
          { name: 'Budhanilkantha', type: 'नगरपालिका', wards: 9, lat: 27.7924, lng: 85.3590 },
          { name: 'Shankharapur', type: 'नगरपालिका', wards: 9, lat: 27.7565, lng: 85.4356 },
          { name: 'Kageshwari Manohara', type: 'नगरपालिका', wards: 9, lat: 27.7432, lng: 85.3897 },
          { name: 'Changu Narayan', type: 'नगरपालिका', wards: 9, lat: 27.7343, lng: 85.4242 },
          { name: 'Tarakeshwar', type: 'नगरपालिका', wards: 9, lat: 27.7190, lng: 85.2956 },
        ],
      },
      {
        name: 'Lalitpur',
        municipalities: [
          { name: 'Lalitpur', type: 'महानगरपालिका', wards: 29, lat: 27.6644, lng: 85.3188 },
          { name: 'Godawari', type: 'नगरपालिका', wards: 14, lat: 27.5989, lng: 85.3726 },
          { name: 'Mahalaxmi', type: 'नगरपालिका', wards: 11, lat: 27.6214, lng: 85.3981 },
          { name: 'Konjyosom', type: 'गाउँपालिका', wards: 6, lat: 27.5398, lng: 85.2890 },
          { name: 'Bagmati', type: 'गाउँपालिका', wards: 7, lat: 27.5580, lng: 85.2401 },
          { name: 'Mahankal', type: 'गाउँपालिका', wards: 7, lat: 27.6118, lng: 85.2649 },
        ],
      },
      {
        name: 'Bhaktapur',
        municipalities: [
          { name: 'Bhaktapur', type: 'नगरपालिका', wards: 10, lat: 27.6710, lng: 85.4298 },
          { name: 'Madhyapur Thimi', type: 'नगरपालिका', wards: 9, lat: 27.6783, lng: 85.3911 },
          { name: 'Changunarayan', type: 'नगरपालिका', wards: 9, lat: 27.7240, lng: 85.4213 },
          { name: 'Suryabinayak', type: 'नगरपालिका', wards: 9, lat: 27.6654, lng: 85.4606 },
        ],
      },
      {
        name: 'Sindhupalchok',
        municipalities: [
          { name: 'Chautara Sangachokgadhi', type: 'नगरपालिका', wards: 9 },
          { name: 'Melamchi', type: 'नगरपालिका', wards: 9 },
          { name: 'Barhabise', type: 'नगरपालिका', wards: 9 },
          { name: 'Balefi', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Kavre',
        municipalities: [
          { name: 'Dhulikhel', type: 'नगरपालिका', wards: 9, lat: 27.6198, lng: 85.5579 },
          { name: 'Panauti', type: 'नगरपालिका', wards: 9 },
          { name: 'Banepa', type: 'नगरपालिका', wards: 9, lat: 27.6345, lng: 85.5244 },
          { name: 'Nala', type: 'गाउँपालिका', wards: 7 },
          { name: 'Temal', type: 'गाउँपालिका', wards: 7 },
          { name: 'Bethanchok', type: 'गाउँपालिका', wards: 7 },
          { name: 'Mandan Deupur', type: 'नगरपालिका', wards: 9 },
          { name: 'Roshi', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Nuwakot',
        municipalities: [
          { name: 'Bidur', type: 'नगरपालिका', wards: 9 },
          { name: 'Bel Nuwakot', type: 'गाउँपालिका', wards: 7 },
          { name: 'Kakani', type: 'गाउँपालिका', wards: 7 },
          { name: 'Kispang', type: 'गाउँपालिका', wards: 6 },
          { name: 'Suryagadhi', type: 'गाउँपालिका', wards: 7 },
          { name: 'Tadi', type: 'गाउँपालिका', wards: 7 },
          { name: 'Tarkeshwar', type: 'गाउँपालिका', wards: 7 },
          { name: 'Panchakanya', type: 'गाउँपालिका', wards: 7 },
          { name: 'Myagang', type: 'गाउँपालिका', wards: 7 },
          { name: 'Shivapuri', type: 'गाउँपालिका', wards: 7 },
          { name: 'Dupcheshwar', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Makwanpur',
        municipalities: [
          { name: 'Hetauda', type: 'उपमहानगरपालिका', wards: 17, lat: 27.4143, lng: 85.0348 },
          { name: 'Thaha', type: 'नगरपालिका', wards: 9 },
          { name: 'Bagmati', type: 'गाउँपालिका', wards: 7 },
          { name: 'Bhimphedi', type: 'गाउँपालिका', wards: 7 },
          { name: 'Kailash', type: 'गाउँपालिका', wards: 6 },
          { name: 'Makawanpurgadhi', type: 'गाउँपालिका', wards: 7 },
          { name: 'Manahari', type: 'गाउँपालिका', wards: 7 },
          { name: 'Raksirang', type: 'गाउँपालिका', wards: 7 },
        ],
      },
    ],
  },
  {
    id: 4, name: 'Gandaki Province', capital: 'Pokhara',
    districts: [
      {
        name: 'Kaski',
        municipalities: [
          { name: 'Pokhara', type: 'महानगरपालिका', wards: 33, lat: 28.2096, lng: 83.9856 },
          { name: 'Annapurna', type: 'गाउँपालिका', wards: 9 },
          { name: 'Madi', type: 'गाउँपालिका', wards: 6 },
          { name: 'Machhapuchchhre', type: 'गाउँपालिका', wards: 8 },
          { name: 'Rupa', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Syangja',
        municipalities: [
          { name: 'Waling', type: 'नगरपालिका', wards: 9 },
          { name: 'Putalibazar', type: 'नगरपालिका', wards: 9 },
          { name: 'Galyang', type: 'नगरपालिका', wards: 9 },
          { name: 'Chapakot', type: 'नगरपालिका', wards: 9 },
          { name: 'Bhirkot', type: 'नगरपालिका', wards: 9 },
          { name: 'Arjunchaupari', type: 'गाउँपालिका', wards: 9 },
        ],
      },
      {
        name: 'Tanahu',
        municipalities: [
          { name: 'Damauli', type: 'नगरपालिका', wards: 9 },
          { name: 'Byas', type: 'नगरपालिका', wards: 11 },
          { name: 'Bandipur', type: 'गाउँपालिका', wards: 7 },
          { name: 'Ghiring', type: 'गाउँपालिका', wards: 7 },
          { name: 'Anbukhaireni', type: 'गाउँपालिका', wards: 7 },
          { name: 'Devghat', type: 'गाउँपालिका', wards: 7 },
          { name: 'Myagde', type: 'गाउँपालिका', wards: 9 },
          { name: 'Rhishing', type: 'गाउँपालिका', wards: 9 },
          { name: 'Shuklagandaki', type: 'नगरपालिका', wards: 11 },
        ],
      },
      {
        name: 'Gorkha',
        municipalities: [
          { name: 'Gorkha', type: 'नगरपालिका', wards: 14 },
          { name: 'Palungtar', type: 'नगरपालिका', wards: 9 },
          { name: 'Arughat', type: 'गाउँपालिका', wards: 9 },
          { name: 'Barpak Sulikot', type: 'गाउँपालिका', wards: 9 },
          { name: 'Dharche', type: 'गाउँपालिका', wards: 8 },
        ],
      },
      {
        name: 'Lamjung',
        municipalities: [
          { name: 'Besisahar', type: 'नगरपालिका', wards: 9 },
          { name: 'Madhya Nepal', type: 'नगरपालिका', wards: 9 },
          { name: 'Rainas', type: 'नगरपालिका', wards: 9 },
          { name: 'Sundarbazar', type: 'नगरपालिका', wards: 9 },
          { name: 'Dordi', type: 'गाउँपालिका', wards: 7 },
          { name: 'Kwholasothar', type: 'गाउँपालिका', wards: 7 },
          { name: 'Marsyangdi', type: 'गाउँपालिका', wards: 8 },
        ],
      },
    ],
  },
  {
    id: 5, name: 'Lumbini Province', capital: 'Deukhuri',
    districts: [
      {
        name: 'Rupandehi',
        municipalities: [
          { name: 'Butwal', type: 'उपमहानगरपालिका', wards: 19, lat: 27.7006, lng: 83.4532 },
          { name: 'Tilottama', type: 'नगरपालिका', wards: 18, lat: 27.6826, lng: 83.5010 },
          { name: 'Siddarthanagar', type: 'उपमहानगरपालिका', wards: 19, lat: 27.5036, lng: 83.4651 },
          { name: 'Sainamaina', type: 'नगरपालिका', wards: 9 },
          { name: 'Devdaha', type: 'नगरपालिका', wards: 9 },
          { name: 'Lumbini Sanskritik', type: 'नगरपालिका', wards: 9 },
          { name: 'Rohini', type: 'गाउँपालिका', wards: 7 },
          { name: 'Gaidahawa', type: 'गाउँपालिका', wards: 7 },
          { name: 'Kanchan', type: 'गाउँपालिका', wards: 7 },
          { name: 'Kotahimai', type: 'गाउँपालिका', wards: 7 },
          { name: 'Mayadevi', type: 'गाउँपालिका', wards: 7 },
          { name: 'Marchawari', type: 'गाउँपालिका', wards: 7 },
          { name: 'Om Satiya', type: 'गाउँपालिका', wards: 7 },
          { name: 'Saljhandi', type: 'गाउँपालिका', wards: 7 },
          { name: 'Sammarimai', type: 'गाउँपालिका', wards: 7 },
          { name: 'Sudhdhodhan', type: 'गाउँपालिका', wards: 7 },
          { name: 'Tillotama', type: 'गाउँपालिका', wards: 9 },
        ],
      },
      {
        name: 'Palpa',
        municipalities: [
          { name: 'Tansen', type: 'नगरपालिका', wards: 9, lat: 27.8667, lng: 83.5511 },
          { name: 'Rampur', type: 'नगरपालिका', wards: 9 },
          { name: 'Rambha', type: 'गाउँपालिका', wards: 8 },
          { name: 'Bagnaskali', type: 'गाउँपालिका', wards: 7 },
          { name: 'Mathagadhi', type: 'गाउँपालिका', wards: 8 },
          { name: 'Purbakhola', type: 'गाउँपालिका', wards: 8 },
          { name: 'Ribdikot', type: 'गाउँपालिका', wards: 8 },
          { name: 'Tinau', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Kapilbastu',
        municipalities: [
          { name: 'Kapilbastu', type: 'नगरपालिका', wards: 9 },
          { name: 'Krishnanagar', type: 'नगरपालिका', wards: 9, lat: 27.5411, lng: 83.0591 },
          { name: 'Banganga', type: 'नगरपालिका', wards: 9 },
          { name: 'Buddhabhumi', type: 'नगरपालिका', wards: 9 },
          { name: 'Mayadevi', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Nawalparasi (Bardaghat Susta West)',
        municipalities: [
          { name: 'Bardaghat', type: 'नगरपालिका', wards: 9 },
          { name: 'Sunwal', type: 'नगरपालिका', wards: 9 },
          { name: 'Palhi Nandan', type: 'गाउँपालिका', wards: 7 },
          { name: 'Pratappur', type: 'गाउँपालिका', wards: 7 },
          { name: 'Ramgram', type: 'नगरपालिका', wards: 9 },
          { name: 'Sarawal', type: 'गाउँपालिका', wards: 7 },
          { name: 'Susta', type: 'गाउँपालिका', wards: 7 },
        ],
      },
    ],
  },
  {
    id: 6, name: 'Karnali Province', capital: 'Birendranagar',
    districts: [
      {
        name: 'Surkhet',
        municipalities: [
          { name: 'Birendranagar', type: 'नगरपालिका', wards: 9, lat: 28.6000, lng: 81.6167 },
          { name: 'Gurbhakot', type: 'नगरपालिका', wards: 9 },
          { name: 'Bheriganga', type: 'नगरपालिका', wards: 9 },
          { name: 'Lekbesi', type: 'नगरपालिका', wards: 9 },
          { name: 'Panchapuri', type: 'नगरपालिका', wards: 9 },
          { name: 'Barahatal', type: 'गाउँपालिका', wards: 7 },
          { name: 'Chaukune', type: 'गाउँपालिका', wards: 7 },
          { name: 'Simta', type: 'गाउँपालिका', wards: 6 },
        ],
      },
      {
        name: 'Jumla',
        municipalities: [
          { name: 'Chandannath', type: 'नगरपालिका', wards: 9 },
          { name: 'Tila', type: 'गाउँपालिका', wards: 8 },
          { name: 'Hima', type: 'गाउँपालिका', wards: 9 },
          { name: 'Sinja', type: 'गाउँपालिका', wards: 8 },
          { name: 'Guthichaur', type: 'गाउँपालिका', wards: 7 },
        ],
      },
      {
        name: 'Dolpa',
        municipalities: [
          { name: 'Dunai', type: 'नगरपालिका', wards: 9 },
          { name: 'Chharka Tangsong', type: 'गाउँपालिका', wards: 5 },
          { name: 'Dolpo Buddha', type: 'गाउँपालिका', wards: 8 },
        ],
      },
    ],
  },
  {
    id: 7, name: 'Sudurpashchim Province', capital: 'Godawari (Kailali)',
    districts: [
      {
        name: 'Kailali',
        municipalities: [
          { name: 'Dhangadhi', type: 'उपमहानगरपालिका', wards: 18, lat: 28.7010, lng: 80.5850 },
          { name: 'Tikapur', type: 'नगरपालिका', wards: 9, lat: 28.5222, lng: 81.1250 },
          { name: 'Ghodaghodi', type: 'नगरपालिका', wards: 15 },
          { name: 'Bhajani', type: 'नगरपालिका', wards: 9 },
          { name: 'Godawari', type: 'नगरपालिका', wards: 12 },
          { name: 'Kailari', type: 'गाउँपालिका', wards: 11 },
          { name: 'Joshipur', type: 'गाउँपालिका', wards: 9 },
          { name: 'Bardagoriya', type: 'गाउँपालिका', wards: 7 },
          { name: 'Chure', type: 'गाउँपालिका', wards: 7 },
          { name: 'Janaki', type: 'गाउँपालिका', wards: 10 },
          { name: 'Lamki Chuha', type: 'नगरपालिका', wards: 9 },
          { name: 'Mohanyal', type: 'गाउँपालिका', wards: 8 },
          { name: 'Sahajpur', type: 'गाउँपालिका', wards: 9 },
        ],
      },
      {
        name: 'Dadeldhura',
        municipalities: [
          { name: 'Amargadhi', type: 'नगरपालिका', wards: 9, lat: 29.3005, lng: 80.5792 },
          { name: 'Aalital', type: 'गाउँपालिका', wards: 5 },
          { name: 'Ganyapdhura', type: 'गाउँपालिका', wards: 5 },
          { name: 'Nawadurga', type: 'गाउँपालिका', wards: 6 },
          { name: 'परशुराम', type: 'नगरपालिका', wards: 9 },
        ],
      },
      {
        name: 'Kanchanpur',
        municipalities: [
          { name: 'Bhimdatta', type: 'नगरपालिका', wards: 17, lat: 28.9997, lng: 80.5573 },
          { name: 'Belauri', type: 'नगरपालिका', wards: 9 },
          { name: 'Krishnapur', type: 'नगरपालिका', wards: 9 },
          { name: 'Punarbas', type: 'नगरपालिका', wards: 9 },
          { name: 'Shuklaphanta', type: 'नगरपालिका', wards: 9 },
          { name: 'Bedkot', type: 'नगरपालिका', wards: 9 },
          { name: 'Laljhadi', type: 'गाउँपालिका', wards: 7 },
        ],
      },
    ],
  },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getDistricts(provinceName: string): District[] {
  return NEPAL_PROVINCES.find(p => p.name === provinceName)?.districts ?? []
}

export function getMunicipalities(provinceName: string, districtName: string): Municipality[] {
  return getDistricts(provinceName).find(d => d.name === districtName)?.municipalities ?? []
}

// Municipality coordinates for logistics coverage checks
export function getMunicipalityCoords(
  provinceName: string,
  districtName: string,
  municipalityName: string
): { lat: number; lng: number } | null {
  const m = getMunicipalities(provinceName, districtName).find(m => m.name === municipalityName)
  if (m?.lat && m?.lng) return { lat: m.lat, lng: m.lng }
  return null
}

// Pathao covers Kathmandu Valley primarily
export const PATHAO_DISTRICTS = new Set([
  'Kathmandu', 'Lalitpur', 'Bhaktapur',
])

// Pick & Drop branches (district names from their API)
export const PND_DISTRICTS = new Set([
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kavre', 'Nuwakot', 'Sindhupalchok',
  'Morang', 'Sunsari', 'Jhapa', 'Ilam',
  'Parsa', 'Dhanusha', 'Sarlahi', 'Mahottari', 'Siraha',
  'Kaski', 'Syangja', 'Tanahu', 'Gorkha', 'Lamjung',
  'Rupandehi', 'Palpa', 'Kapilbastu',
  'Surkhet', 'Kailali', 'Kanchanpur', 'Dadeldhura',
  'Makwanpur',
])

export const STORE_PICKUP_PRICE = 50 // NPR — store pickup fixed charge
export const FALLBACK_COURIER_PRICE = 250 // NPR — if no partner available

export const STORE_ADDRESS = 'Balapasa Store, Kathmandu'
