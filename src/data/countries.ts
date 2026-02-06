export type CountryEntry = [string, string, string, string]; // ISO, Name, Dial, Mask

export const COUNTRIES: CountryEntry[] = [
    // --- Major & Original List ---
    ['US', 'United States', '1', '### ### ####'],
    ['GB', 'United Kingdom', '44', '#### ######'],
    ['VN', 'Vietnam', '84', '### #### ###'],
    ['JP', 'Japan', '81', '## #### ####'],
    ['CN', 'China', '86', '### #### ####'],
    ['IN', 'India', '91', '#### ######'],
    ['DE', 'Germany', '49', '#### #######'],
    ['FR', 'France', '33', '# ## ## ## ##'],
    ['RU', 'Russia', '7', '### ###-##-##'],
    ['BR', 'Brazil', '55', '## #####-####'],
    ['IT', 'Italy', '39', '### #######'],
    ['CA', 'Canada', '1', '### ### ####'],
    ['AU', 'Australia', '61', '# #### ####'],
    ['KR', 'South Korea', '82', '## #### ####'],
    ['ES', 'Spain', '34', '### ## ## ##'],
    ['ID', 'Indonesia', '62', '###-####-####'],
    ['MX', 'Mexico', '52', '## #### ####'],
    ['TR', 'Turkey', '90', '### ### ## ##'],
    ['NL', 'Netherlands', '31', '# ########'],
    ['SA', 'Saudi Arabia', '966', '# ### ####'],
    ['CH', 'Switzerland', '41', '## ### ## ##'],
    ['SE', 'Sweden', '46', '## ### ## ##'],
    ['BE', 'Belgium', '32', '### ## ## ##'],
    ['AT', 'Austria', '43', '#### #######'],
    ['PL', 'Poland', '48', '### ### ###'],
    ['AR', 'Argentina', '54', '# ## ####-####'],
    ['NO', 'Norway', '47', '### ## ###'],
    ['TW', 'Taiwan', '886', '### ### ###'],
    ['TH', 'Thailand', '66', '## ### ####'],
    ['MY', 'Malaysia', '60', '##-### ####'],
    ['SG', 'Singapore', '65', '#### ####'],
    ['ZA', 'South Africa', '27', '## ### ####'],
    ['HK', 'Hong Kong', '852', '#### ####'],
    ['PH', 'Philippines', '63', '### ### ####'],
    ['UA', 'Ukraine', '380', '## ### ## ##'],
    ['EG', 'Egypt', '20', '### ### ####'],
    ['PK', 'Pakistan', '92', '### #######'],
    ['IL', 'Israel', '972', '##-#######'],
    ['DK', 'Denmark', '45', '## ## ## ##'],
    ['FI', 'Finland', '358', '## ### ## ##'],
    ['NZ', 'New Zealand', '64', '## ### ####'],
    ['IE', 'Ireland', '353', '## #######'],
    ['PT', 'Portugal', '351', '### ### ###'],
    ['GR', 'Greece', '30', '### #######'],
    ['HU', 'Hungary', '36', '## ### ####'],
    ['CZ', 'Czech Republic', '420', '### ### ###'],
    ['RO', 'Romania', '40', '## ### ####'],
    ['CL', 'Chile', '56', '# #### ####'],
    ['CO', 'Colombia', '57', '### ### ####'],
    ['NG', 'Nigeria', '234', '### ### ####'],

    // --- Newly Added Countries ---

    // Southeast Asia Neighbors
    ['KH', 'Cambodia', '855', '## ### ###'],
    ['LA', 'Laos', '856', '## ## ####'],
    ['MM', 'Myanmar', '95', '## ### ###'],

    // South Asia
    ['BD', 'Bangladesh', '880', '####-######'],
    ['LK', 'Sri Lanka', '94', '## # ### ###'],
    ['NP', 'Nepal', '977', '##-######'],

    // Middle East
    ['AE', 'United Arab Emirates', '971', '## ### ####'],
    ['QA', 'Qatar', '974', '#### ####'],
    ['KW', 'Kuwait', '965', '#### ####'],
    ['BH', 'Bahrain', '973', '#### ####'],
    ['OM', 'Oman', '968', '#### ####'],
    ['JO', 'Jordan', '962', '# #### ####'],
    ['LB', 'Lebanon', '961', '## ######'],
    ['IR', 'Iran', '98', '### ### ####'],
    ['IQ', 'Iraq', '964', '### ### ####'],

    // Europe
    ['BG', 'Bulgaria', '359', '## ### ###'],
    ['HR', 'Croatia', '385', '## ### ####'],
    ['RS', 'Serbia', '381', '## #######'],
    ['SK', 'Slovakia', '421', '### ### ###'],
    ['SI', 'Slovenia', '386', '## ### ###'],
    ['EE', 'Estonia', '372', '#### ####'],
    ['LV', 'Latvia', '371', '## ### ###'],
    ['LT', 'Lithuania', '370', '### ## ###'],

    // Americas
    ['PE', 'Peru', '51', '### ### ###'],
    ['VE', 'Venezuela', '58', '###-#######'],
    ['EC', 'Ecuador', '593', '## ### ####'],
    ['UY', 'Uruguay', '598', '# ### ## ##'],
    ['PY', 'Paraguay', '595', '### ### ###'],
    ['CR', 'Costa Rica', '506', '#### ####'],
    ['PA', 'Panama', '507', '####-####'],
    ['DO', 'Dominican Republic', '1', '### ### ####'],

    // Africa
    ['MA', 'Morocco', '212', '##-####-###'],
    ['DZ', 'Algeria', '213', '## ## ## ##'],
    ['TN', 'Tunisia', '216', '## ### ###'],
    ['KE', 'Kenya', '254', '### ######'],
    ['GH', 'Ghana', '233', '## ### ####'],
    ['ET', 'Ethiopia', '251', '## ### ####'],
    ['UG', 'Uganda', '256', '### ######'],
    ['TZ', 'Tanzania', '255', '## ### ####'],

    // Central Asia
    ['KZ', 'Kazakhstan', '7', '### ###-##-##'], // Shares code with Russia
    ['UZ', 'Uzbekistan', '998', '## ### ## ##']
];