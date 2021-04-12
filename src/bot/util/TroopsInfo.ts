export default {
	SUPER_TROOPS: [
		{
			name: 'Super Barbarian',
			original: 'Barbarian',
			minOriginalLevel: 8,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Sneaky Goblin',
			original: 'Goblin',
			minOriginalLevel: 7,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Giant',
			original: 'Giant',
			minOriginalLevel: 9,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Wall Breaker',
			original: 'Wall Breaker',
			minOriginalLevel: 7,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Archer',
			original: 'Archer',
			minOriginalLevel: 8,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Witch',
			original: 'Witch',
			minOriginalLevel: 5,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Inferno Dragon',
			original: 'Baby Dragon',
			minOriginalLevel: 6,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Valkyrie',
			original: 'Valkyrie',
			minOriginalLevel: 7,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Minion',
			original: 'Minion',
			minOriginalLevel: 8,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Wizard',
			original: 'Wizard',
			minOriginalLevel: 9,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Ice Hound',
			original: 'Lava Hound',
			minOriginalLevel: 5,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		}
	],
	TROOPS: [
		{
			name: 'Barbarian King',
			village: 'home',
			productionBuilding: 'Town Hall',
			type: 'hero',
			upgrade: {
				unlockCost: 6000,
				unlockTime: 240,
				cost: [6000, 7000, 8000, 10000, 11000, 12000, 13000, 14000, 15000, 17000, 19000, 21000, 23000, 25000, 27000, 29000, 31000, 33000, 35000, 37000, 39000, 41000, 43000, 45000, 48000, 51000, 54000, 57000, 60000, 63000, 66000, 69000, 72000, 75000, 80000, 85000, 90000, 95000, 100000, 105000, 110000, 120000, 130000, 140000, 150000, 160000, 170000, 180000, 190000, 200000, 203000, 206000, 209000, 212000, 215000, 218000, 221000, 224000, 227000, 230000, 233000, 236000, 239000, 240000, 250000, 260000, 270000, 280000, 290000, 292000, 294000, 296000, 298000, 300000, 305000, 310000, 315000, 320000, 325000],
				time: [240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320, 1440, 1920, 2400, 2880, 2880, 2880, 2880, 2880, 4320, 4320, 4320, 4320, 4320, 5040, 5040, 5040, 5040, 5040, 5760, 5760, 5760, 5760, 5760, 7200, 7200, 7200, 7200, 7200, 8640, 8640, 8640, 8640, 8640, 9360, 9360, 9360, 9360, 9360, 9360, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10800, 10800, 10800, 10800, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 5, 10, 30, 40, 50, 65, 75, 80]
		},
		{
			name: 'Archer Queen',
			village: 'home',
			productionBuilding: 'Town Hall',
			type: 'hero',
			upgrade: {
				unlockCost: 11000,
				unlockTime: 240,
				cost: [11000, 12000, 13000, 15000, 16000, 17000, 18000, 19000, 20000, 22000, 24000, 26000, 28000, 30000, 32000, 34000, 36000, 38000, 40000, 42000, 44000, 46000, 48000, 50000, 53000, 56000, 59000, 62000, 65000, 68000, 71000, 74000, 77000, 80000, 85000, 90000, 95000, 100000, 105000, 115000, 120000, 125000, 135000, 145000, 155000, 165000, 175000, 185000, 195000, 200000, 204000, 208000, 212000, 216000, 220000, 224000, 228000, 232000, 236000, 240000, 240000, 240000, 240000, 240000, 250000, 260000, 270000, 280000, 290000, 292000, 294000, 296000, 298000, 300000, 306000, 312000, 318000, 324000, 330000],
				time: [240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320, 1440, 1920, 2400, 2880, 2880, 2880, 2880, 2880, 4320, 4320, 4320, 4320, 4320, 5040, 5040, 5040, 5040, 5040, 5760, 5760, 5760, 5760, 5760, 7200, 7200, 7200, 7200, 7200, 8640, 8640, 8640, 8640, 8640, 9360, 9360, 9360, 9360, 9360, 9360, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10800, 10800, 10800, 10800, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 30, 40, 50, 65, 75, 80]
		},
		{
			name: 'Grand Warden',
			village: 'home',
			productionBuilding: 'Town Hall',
			type: 'hero',
			upgrade: {
				unlockCost: 2250000,
				unlockTime: 240,
				cost: [2250000, 2500000, 2750000, 3000000, 3300000, 3750000, 4500000, 5250000, 6000000, 7000000, 7500000, 8000000, 8400000, 8800000, 9100000, 9400000, 9600000, 9800000, 10000000, 10000000, 10200000, 10400000, 10600000, 10800000, 11000000, 11200000, 11400000, 11600000, 11800000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12500000, 13000000, 13500000, 14000000, 14500000, 15000000, 15500000, 16000000, 16500000, 17000000, 17500000, 18000000, 18500000, 19000000],
				time: [240, 480, 720, 1440, 2160, 2880, 4320, 5760, 6480, 7200, 7920, 8640, 9360, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10080, 10800, 10800, 10800, 10800, 10800, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 40, 50, 55]
		},
		{
			name: 'Battle Machine',
			village: 'builderBase',
			productionBuilding: 'Builder Hall',
			type: 'hero',
			upgrade: {
				unlockCost: 1000000,
				unlockTime: 720,
				cost: [1000000, 1100000, 1200000, 1300000, 1500000, 1600000, 1700000, 1800000, 1900000, 2100000, 2200000, 2300000, 2400000, 2500000, 2600000, 2700000, 2800000, 2900000, 3000000, 3100000, 3200000, 3300000, 3400000, 3500000, 3600000, 3700000, 3800000, 3900000, 4000000, 4000000],
				time: [720, 720, 1440, 1440, 1440, 1440, 1440, 1440, 1440, 2880, 2880, 2880, 2880, 2880, 4320, 4320, 4320, 4320, 4320, 4320, 4320, 4320, 4320, 4320, 5760, 5760, 5760, 5760, 5760, 5760],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 5, 10, 20, 25, 30]
		},
		{
			name: 'Royal Champion',
			village: 'home',
			productionBuilding: 'Town Hall',
			type: 'hero',
			upgrade: {
				unlockCost: 130000,
				unlockTime: 1440,
				cost: [130000, 140000, 150000, 160000, 170000, 180000, 190000, 200000, 210000, 220000, 230000, 235000, 240000, 245000, 250000, 255000, 260000, 265000, 270000, 275000, 280000, 285000, 290000, 295000, 300000, 305000, 310000, 315000, 320000],
				time: [1440, 2160, 2880, 3600, 4320, 5040, 5760, 6480, 7200, 7920, 8640, 9360, 10080, 10080, 10800, 10800, 10800, 10800, 10800, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520, 11520],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 30]
		},
		{
			name: 'Lightning Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				unlockTime: 480,
				unlockCost: 200000,
				cost: [85000, 225000, 450000, 900000, 2000000, 4000000, 8000000, 10000000],
				time: [720, 1440, 2160, 4320, 7200, 11520, 15120, 18720],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 4, 4, 4, 5, 6, 7, 8, 9, 9, 9]
		},
		{
			name: 'Healing Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				unlockTime: 1440,
				unlockCost: 400000,
				cost: [75000, 300000, 600000, 1200000, 2500000, 4500000, 14000000],
				time: [360, 1080, 2160, 4320, 7200, 12960, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 3, 4, 5, 6, 7, 7, 7, 8, 8]
		},
		{
			name: 'Rage Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				unlockTime: 2880,
				unlockCost: 800000,
				cost: [450000, 900000, 1800000, 3000000, 11000000],
				time: [1080, 2160, 4320, 7200, 16560],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 6, 6, 6]
		},
		{
			name: 'Jump Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				unlockTime: 5040,
				unlockCost: 1200000,
				cost: [3000000, 6000000, 13000000],
				time: [5760, 10080, 21600],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3, 3, 4, 4]
		},
		{
			name: 'Freeze Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				unlockTime: 5040,
				unlockCost: 1200000,
				cost: [1500000, 2500000, 4200000, 6000000, 8500000, 11000000],
				time: [2880, 5760, 8640, 10800, 12960, 16560],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 6, 7, 7, 7]
		},
		{
			name: 'Poison Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				unlockTime: 360,
				unlockCost: 250000,
				cost: [20000, 40000, 75000, 150000, 200000, 260000, 300000],
				time: [1440, 2880, 5760, 12960, 15840, 22320, 25200],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8]
		},
		{
			name: 'Earthquake Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				unlockTime: 1080,
				unlockCost: 500000,
				cost: [20000, 40000, 75000, 120000],
				time: [2880, 5760, 10800, 15840],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 5, 5, 5]
		},
		{
			name: 'Haste Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				unlockTime: 2880,
				unlockCost: 1000000,
				cost: [30000, 50000, 80000, 120000],
				time: [3600, 7200, 11520, 15840],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 5, 5, 5]
		},
		{
			name: 'Clone Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				unlockTime: 7200,
				unlockCost: 2400000,
				cost: [3000000, 4500000, 7000000, 9000000, 14000000, 16500000],
				time: [4320, 6480, 9360, 16560, 21600, 23760],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 5, 6, 7]
		},
		{
			name: 'Skeleton Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				unlockTime: 5760,
				unlockCost: 2000000,
				cost: [25000, 40000, 70000, 125000, 150000, 250000],
				time: [3600, 5760, 9360, 12240, 15120, 21600],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 6, 7, 7]
		},
		{
			name: 'Bat Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				unlockTime: 8640,
				unlockCost: 3000000,
				cost: [30000, 60000, 120000, 160000],
				time: [4320, 7920, 10800, 12960],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 5, 5, 5]
		},
		{
			name: 'Invisibility Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				unlockTime: 10080,
				unlockCost: 4800000,
				cost: [9000000, 12000000, 15000000],
				time: [12960, 16560, 22320],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 4]
		},
		{
			name: 'L.A.S.S.I',
			village: 'home',
			type: 'troop',
			productionBuilding: 'Pet House',
			upgrade: {
				unlockTime: 720,
				unlockCost: 240000,
				cost: [115000, 130000, 145000, 160000, 175000, 190000, 205000, 220000, 235000],
				time: [4320, 5760, 7200, 7920, 8640, 9360, 10080, 10800, 11520],
				resource: 'Pet House'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
		},
		{
			name: 'Mighty Yak',
			village: 'home',
			type: 'troop',
			productionBuilding: 'Pet House',
			upgrade: {
				unlockTime: 3600,
				unlockCost: 2000000,
				cost: [165000, 185000, 205000, 225000, 245000, 255000, 265000, 275000, 285000],
				time: [4320, 5760, 7200, 7920, 8640, 9360, 10080, 10800, 11520],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
		},
		{
			name: 'Electro Owl',
			village: 'home',
			type: 'troop',
			productionBuilding: 'Pet House',
			upgrade: {
				unlockTime: 240,
				unlockCost: 10000,
				cost: [135000, 150000, 165000, 180000, 195000, 210000, 225000, 240000, 255000],
				time: [4320, 5760, 7200, 7920, 8640, 9360, 10080, 10800, 11520],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
		},
		{
			name: 'Unicorn',
			village: 'home',
			type: 'troop',
			productionBuilding: 'Pet House',
			upgrade: {
				unlockTime: 1440,
				unlockCost: 1000000,
				cost: [210000, 220000, 230000, 240000, 250000, 260000, 270000, 280000, 290000],
				time: [4320, 5760, 7200, 7920, 8640, 9360, 10080, 10800, 11520],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
		},
		{
			name: 'Barbarian',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 0.16666666666666666,
				unlockCost: 100,
				cost: [25000, 100000, 300000, 1000000, 2000000, 3000000, 5000000, 9500000, 15000000],
				time: [360, 720, 1440, 2160, 3600, 5760, 10080, 17280, 20160],
				resource: 'Elixir'
			},
			levels: [1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 9, 10]
		},
		{
			name: 'Archer',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 1,
				unlockCost: 500,
				cost: [40000, 160000, 480000, 1300000, 2500000, 3500000, 5500000, 10000000, 15500000],
				time: [720, 1440, 2160, 2880, 3600, 5760, 10080, 17280, 20160],
				resource: 'Elixir'
			},
			levels: [0, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 9, 10]
		},
		{
			name: 'Goblin',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 60,
				unlockCost: 5000,
				cost: [50000, 200000, 600000, 1200000, 2500000, 4000000, 9500000],
				time: [720, 1440, 2160, 2880, 5040, 8640, 17280],
				resource: 'Elixir'
			},
			levels: [0, 1, 2, 2, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8]
		},
		{
			name: 'Giant',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 10,
				unlockCost: 2500,
				cost: [50000, 200000, 600000, 1500000, 2500000, 4000000, 6000000, 10500000, 15000000],
				time: [540, 1080, 2160, 3600, 5760, 7200, 12960, 20160, 21600],
				resource: 'Elixir'
			},
			levels: [0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]
		},
		{
			name: 'Wall Breaker',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 240,
				unlockCost: 10000,
				cost: [100000, 250000, 750000, 1500000, 3500000, 7500000, 11500000, 14000000, 16000000],
				time: [720, 1440, 2160, 2880, 5760, 10080, 15840, 21600, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 1, 2, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10]
		},
		{
			name: 'Balloon',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 480,
				unlockCost: 80000,
				cost: [150000, 450000, 900000, 1800000, 3500000, 7500000, 12000000, 14000000],
				time: [720, 1440, 2880, 4320, 5760, 11520, 20160, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 2, 2, 3, 4, 5, 6, 6, 7, 8, 9, 9]
		},
		{
			name: 'Wizard',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 720,
				unlockCost: 240000,
				cost: [150000, 350000, 650000, 1300000, 2600000, 5000000, 8000000, 10000000, 15000000],
				time: [720, 1440, 2160, 2880, 5760, 8640, 12960, 18720, 21600],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]
		},
		{
			name: 'Healer',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 960,
				unlockCost: 700000,
				cost: [500000, 1000000, 3000000, 9500000, 14500000, 17000000],
				time: [2160, 3600, 5760, 17040, 21600, 24480],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 1, 2, 3, 4, 4, 5, 5, 6, 7]
		},
		{
			name: 'Dragon',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 1440,
				unlockCost: 1000000,
				cost: [1750000, 2500000, 4000000, 6000000, 8000000, 10000000, 15000000],
				time: [2160, 4320, 7200, 10080, 12960, 20160, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 8]
		},
		{
			name: 'P.E.K.K.A',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 2160,
				unlockCost: 1500000,
				cost: [1500000, 2250000, 3200000, 4500000, 6000000, 9000000, 12000000, 15500000],
				time: [2880, 5040, 6480, 8640, 10080, 14400, 20160, 21600],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 3, 4, 6, 7, 8, 9, 9]
		},
		{
			name: 'Minion',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 240,
				unlockCost: 300000,
				cost: [3000, 7000, 15000, 25000, 40000, 90000, 150000, 250000, 300000],
				time: [1440, 2160, 2880, 4320, 6480, 10080, 20160, 22320, 23760],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 8, 9, 10]
		},
		{
			name: 'Hog Rider',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 720,
				unlockCost: 600000,
				cost: [5000, 9000, 16000, 30000, 50000, 100000, 150000, 240000, 280000],
				time: [1800, 2880, 3600, 5760, 7200, 10800, 16560, 20160, 23040],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 9, 10, 10]
		},
		{
			name: 'Valkyrie',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 1080,
				unlockCost: 900000,
				cost: [8000, 12000, 25000, 45000, 90000, 175000, 260000, 310000],
				time: [3240, 4320, 5760, 8640, 12240, 18720, 23040, 24480],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 8, 9]
		},
		{
			name: 'Golem',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 1440,
				unlockCost: 1300000,
				cost: [10000, 20000, 30000, 50000, 75000, 110000, 160000, 200000, 270000, 320000],
				time: [3600, 4320, 5760, 7200, 10080, 11520, 15120, 20160, 23040, 24480],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 7, 9, 10, 10]
		},
		{
			name: 'Witch',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 2880,
				unlockCost: 2000000,
				cost: [50000, 80000, 130000, 200000],
				time: [7200, 9360, 13680, 20160],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 5, 5]
		},
		{
			name: 'Lava Hound',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 4320,
				unlockCost: 2500000,
				cost: [35000, 60000, 120000, 190000, 270000],
				time: [3600, 7200, 12960, 20160, 23040],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 6]
		},
		{
			name: 'Bowler',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 7200,
				unlockCost: 3000000,
				cost: [75000, 125000, 200000, 280000],
				time: [8640, 12960, 20160, 23040],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 5]
		},
		{
			name: 'Baby Dragon',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 3600,
				unlockCost: 2000000,
				cost: [2500000, 3500000, 4500000, 7000000, 9000000, 15000000, 17000000],
				time: [4320, 7200, 10080, 12960, 17280, 22320, 23760],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 8]
		},
		{
			name: 'Miner',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 5760,
				unlockCost: 3000000,
				cost: [3500000, 4500000, 6000000, 8000000, 10500000, 14000000],
				time: [4320, 7200, 10800, 15120, 20160, 22320],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 6, 7, 7]
		},
		{
			name: 'Raged Barbarian',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 0,
				unlockCost: 1000,
				cost: [3500, 6000, 9000, 50000, 100000, 300000, 330000, 700000, 900000, 1000000, 1200000, 2000000, 2200000, 3000000, 3200000, 3800000, 4000000],
				time: [0, 5, 15, 180, 360, 720, 720, 1440, 1440, 2880, 2880, 4320, 4320, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [2, 4, 6, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Sneaky Archer',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 1,
				unlockCost: 4000,
				cost: [5000, 8000, 12000, 60000, 120000, 320000, 350000, 800000, 1000000, 1100000, 1300000, 2100000, 2300000, 3100000, 3300000, 3900000, 4100000],
				time: [3, 10, 30, 240, 360, 720, 720, 1440, 1440, 2880, 2880, 4320, 4320, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 4, 6, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Beta Minion',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 30,
				unlockCost: 25000,
				cost: [50000, 80000, 120000, 250000, 280000, 320000, 360000, 900000, 1100000, 1300000, 1500000, 2300000, 2500000, 3300000, 3500000, 4000000, 4200000],
				time: [60, 180, 300, 480, 720, 720, 720, 1440, 1440, 2880, 2880, 4320, 4320, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 4, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Boxer Giant',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 10,
				unlockCost: 10000,
				cost: [20000, 40000, 60000, 300000, 320000, 340000, 380000, 1000000, 1200000, 1300000, 1500000, 2300000, 2500000, 3300000, 3500000, 4000000, 4200000],
				time: [30, 60, 120, 480, 720, 720, 720, 1440, 1440, 2880, 2880, 4320, 4320, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 4, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Bomber',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 180,
				unlockCost: 100000,
				cost: [150000, 200000, 250000, 280000, 320000, 340000, 360000, 900000, 1000000, 1200000, 1400000, 2200000, 2400000, 3200000, 3400000, 3900000, 4100000],
				time: [180, 300, 480, 720, 720, 720, 720, 1440, 1440, 2880, 2880, 4320, 4320, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Super P.E.K.K.A',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 1440,
				unlockCost: 1500000,
				cost: [1600000, 1700000, 1800000, 1900000, 2000000, 2200000, 2400000, 2600000, 2800000, 3000000, 3200000, 3400000, 3600000, 3800000, 4000000, 4600000, 4800000],
				time: [1440, 1440, 2880, 2880, 4320, 4320, 5760, 5760, 5760, 5760, 5760, 5760, 5760, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 16, 18]
		},
		{
			name: 'Cannon Cart',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 480,
				unlockCost: 300000,
				cost: [400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, 1400000, 1600000, 2400000, 2600000, 3400000, 3600000, 4100000, 4300000],
				time: [720, 720, 1440, 1440, 1440, 1440, 1440, 1440, 1440, 2880, 2880, 4320, 4320, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 10, 12, 14, 16, 18]
		},
		{
			name: 'Drop Ship',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 720,
				unlockCost: 1000000,
				cost: [1100000, 1200000, 1300000, 1400000, 1500000, 1600000, 1700000, 1800000, 2000000, 2200000, 2400000, 2600000, 2800000, 3600000, 3800000, 4300000, 4500000],
				time: [720, 720, 1440, 1440, 2880, 2880, 4320, 4320, 4320, 4320, 4320, 4320, 4320, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 14, 16, 18]
		},
		{
			name: 'Baby Dragon',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 360,
				unlockCost: 150000,
				cost: [200000, 240000, 280000, 320000, 360000, 380000, 400000, 1000000, 1200000, 1400000, 1600000, 2400000, 2600000, 3400000, 3600000, 4100000, 4300000],
				time: [300, 480, 720, 720, 720, 720, 720, 1440, 1440, 2880, 2880, 4320, 4320, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Night Witch',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 600,
				unlockCost: 500000,
				cost: [600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, 1300000, 1400000, 1600000, 1800000, 2500000, 2700000, 3500000, 3700000, 4200000, 4400000],
				time: [720, 720, 1440, 1440, 2880, 2880, 2880, 2880, 2880, 2880, 2880, 4320, 4320, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 0, 12, 14, 16, 18]
		},
		{
			name: 'Wall Wrecker',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				unlockTime: 8640,
				unlockCost: 7500000,
				cost: [6000000, 8000000, 14000000],
				time: [11520, 14400, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 4]
		},
		{
			name: 'Battle Blimp',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				unlockTime: 11520,
				unlockCost: 9000000,
				cost: [6000000, 8000000, 14000000],
				time: [11520, 14400, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 4]
		},
		{
			name: 'Yeti',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 12960,
				unlockCost: 5000000,
				cost: [11000000, 15000000],
				time: [20160, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3]
		},
		{
			name: 'Ice Golem',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 12960,
				unlockCost: 4000000,
				cost: [80000, 120000, 160000, 200000, 320000],
				time: [7200, 11520, 15120, 20160, 24480],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 5, 6]
		},
		{
			name: 'Electro Dragon',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 8640,
				unlockCost: 4000000,
				cost: [9000000, 11000000, 16000000],
				time: [14400, 20160, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 4]
		},
		{
			name: 'Stone Slammer',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				unlockTime: 14400,
				unlockCost: 10500000,
				cost: [6000000, 8000000, 14000000],
				time: [11520, 14400, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 4]
		},
		{
			name: 'Hog Glider',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 2160,
				unlockCost: 2000000,
				cost: [1600000, 1700000, 1800000, 1900000, 2000000, 2200000, 2400000, 2600000, 2800000, 3000000, 3200000, 3400000, 3600000, 3800000, 4000000, 4200000, 4400000],
				time: [1440, 1440, 2880, 2880, 4320, 4320, 5760, 5760, 5760, 5760, 5760, 5760, 5760, 5760, 5760, 7200, 7200],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 18]
		},
		{
			name: 'Siege Barracks',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				unlockTime: 20160,
				unlockCost: 14500000,
				cost: [8000000, 11000000, 14000000],
				time: [14400, 20160, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4]
		},
		{
			name: 'Headhunter',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				unlockTime: 18720,
				unlockCost: 7500000,
				cost: [180000, 240000],
				time: [20160, 23040],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3]
		},
		{
			name: 'Log Launcher',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				unlockTime: 23040,
				unlockCost: 16000000,
				cost: [8000000, 11000000, 14000000],
				time: [14400, 20160, 23040],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4]
		}
	]
};
