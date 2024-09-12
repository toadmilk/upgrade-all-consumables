export function setup({ settings, onInterfaceReady, patch }) {

  const upgradeCategories = {
    Misc: ["Portable Rations", "Blood Vial", "Mysterious Stone"],
    Artefact: ["Candelabra", "Candle Lamp", "Charged Ancient Quiver", "Charged Golden Quiver", "Whetstone Fragment"],
    Equipment: ["Explorers Map", "Wizard's Scroll"],
    Consumable: [],
    Bag: [],
  };
  
  const allConsumableUpgrades = Object.keys(upgradeCategories).map((category) => {
    const names = upgradeCategories[category];
    return Array.from(game.bank.itemUpgrades).filter(([root]) => {
      if (category === root.type) {
        return names.length === 0 || names.includes(root.name);
      }
      return false;
    });
  });

  const events = mitt();
  settings.section('General').add([
    {
      type: 'switch',
      label: 'Sell remaining lower tier potions',
      hint: 'For example, if you have 10 Tier I potions and upgrade 9 of them to Tier II, enabling this will sell off the 1 spare potion left.',
      name: 'sell-remainder-potions',
      default: false,
      onChange(value) {
        events.emit('changeSellRemainderPotions', value);
      },
    },
  ]);

  onInterfaceReady(() => {
    const allPotionUpgrades = Array.from(game.bank.itemUpgrades).filter(([root]) => root.type === 'Potion');

    // const upgradeCategories = {
    //   Misc: ["Portable Rations", "Blood Vial", "Mysterious Stone"],
    //   Artefact: ["Candelabra", "Candle Lamp", "Charged Ancient Quiver", "Charged Golden Quiver", "Whetstone Fragment"],
    //   Equipment: ["Explorers Map", "Wizard's Scroll"],
    //   Consumable: [],
    //   Bag: [],
    // };
    
    // const allConsumableUpgrades = Array.from(game.bank.itemUpgrades).filter(([root]) => {
    //   if (upgradeCategories[root.type]) {
    //     return upgradeCategories[root.type].length === 0 || upgradeCategories[root.type].includes(root.name);
    //   }
    //   return false;
    // });    

    const store = ui.createStore({
      lastSelected: null,
      sellRemainderPotions: settings.section('General').get('sell-remainder-potions'),
      setLastSelected(item) {
        this.lastSelected = {
          id: item.id,
          name: item.name.substring(0, item.name.length - (2 + (item.tier === 3 ? 1 : item.tier))),
        };
      },
      setsellRemainderPotions(value) {
        this.sellRemainderPotions = value;
      },
      upgradeAllPotions() {
        upgradeAllPotions(allPotionUpgrades, this.sellRemainderPotions);
      },
      upgradeLast() {
        upgradePotion(this.lastSelected.id, allPotionUpgrades, this.sellRemainderPotions);
      },
      upgradeAllConsumables() {
        upgradeAllConsumables(allConsumableUpgrades);
      }
    });

    patch(Bank, 'toggleItemForSelection').after((_, bankItem) => {
      if (bankItem.item.type !== 'Potion') return;
  
      store.setLastSelected(bankItem.item);
    });

    events.on('changeSellRemainderPotions', (v) => store.setsellRemainderPotions(v));

    // Consumables
    const consumableContainer = document.createElement('div');
    document.querySelector('lang-string[lang-id="BANK_STRING_4"]').parentElement
      .after(consumableContainer);
      
    ui.create({
      $template: '#bc-uap-root-2',
      store,
    }, consumableContainer);

    // Potions
    const potionContainer = document.createElement('div');
    document.querySelector('lang-string[lang-id="BANK_STRING_4"]').parentElement
      .after(potionContainer);

    ui.create({
      $template: '#bc-uap-root',
      store,
    }, potionContainer);
  });
}

function upgradeAllPotions(allPotionUpgrades, sellRemainderPotions) {
  const tiers = [0, 1, 2];
  for (const tier of tiers) {
    const tierUpgrades = allPotionUpgrades.filter(([root]) => root.tier === tier)
      .map(([_, upgrades]) => upgrades.find((upgrade) => upgrade.upgradedItem.type === 'Potion' && upgrade.upgradedItem.tier === tier + 1))
      .filter((upgrade) => game.bank.checkUpgradePotionRequirement(upgrade) && game.bank.getMaxUpgradeQuantity(upgrade) > 0);
    tierUpgrades.forEach((upgrade) => {
      game.bank.upgradeItemOnClick(upgrade, Infinity);
      // Ensure potions were upgraded
      if (game.bank.getMaxUpgradeQuantity(upgrade) === 0 && sellRemainderPotions) {
        const usedPotion = upgrade.rootItems.find((item) => item.tier === upgrade.upgradedItem.tier - 1);
        const qty = game.bank.getQty(usedPotion);
        if (qty > 0) game.bank.processItemSale(usedPotion, qty);
      }
    });
  }
}

function upgradeAllConsumables(categorizedConsumableUpgrades) {

  // TODO: REMOVE!!!
  addTestItems();

  categorizedConsumableUpgrades.forEach((consumableUpgrades) => {
    const upgrades = consumableUpgrades
      .map(([_, upgrades]) => upgrades.find((upgrade) => game.bank.getMaxUpgradeQuantity(upgrade) > 0))
      .filter((upgrade) => upgrade !== undefined);

    upgrades.forEach((upgrade) => {
      const availableMaterial = game.bank.getMaxUpgradeQuantity(upgrade);
      
      // Skip if a previous consumable expended required materials
      if (availableMaterial <= 0) {
        console.log(`Skipping ${upgrade} due to insufficient materials.`);
        return;
      }

      game.bank.upgradeItemOnClick(upgrade, Infinity);
    });
  });
}

function addTestItems() {
  function addTestItem(itemId) {
    game.bank.addItemByID(itemId, 14, true, true, false);
  }

  const items = [
    "melvorF:Thiefs_Moneysack",
    "melvorF:Wizards_Scroll",
    "melvorF:Seed_Pouch",
    "melvorF:Alchemists_Bag",
    "melvorF:Burning_Scroll_Of_Gold",
    "melvorF:Burning_Scroll_Of_Stardust",
    "melvorF:Burning_Scroll_Of_Ash",
    "melvorF:Quick_Burner",
    "melvorF:Golden_Star",
    "melvorTotH:Explorers_Map",
    "melvorTotH:Portable_Rations",
    "melvorTotH:Blood_Vial",
    "melvorD:Mysterious_Stone",
    "melvorTotH:Kindling_Pouch",
    "melvorTotH:Artisan_Pouch",
    "melvorAoD:Whetstone_Fragment",
    "melvorAoD:Charged_Golden_Quiver",
    "melvorAoD:Charged_Ancient_Quiver",
    "melvorAoD:Candle_Lamp",
    "melvorAoD:Candles",
    "melvorAoD:Candelabra",
    "melvorItA:Abyssal_Negation_Contract_I",
    "melvorItA:Abyssal_Coin_Contract_I",
    "melvorItA:Abyssal_Counter_Contract_I",
    "melvorItA:Abyssal_Corruption_Contract_I",
    "melvorItA:Harvesting_Consumable_I",
    "melvorItA:Corrupted_Light_Consumable_I",
    "melvorItA:Dark_Summon_Consumable_I",
    "melvorItA:Toxicity_Consumable_I",
    "melvorItA:Abyssal_Essence_Consumable_I",
    "melvorItA:Shade_Consumable_I",
    "melvorItA:Fear_Consumable_I",
    "melvorItA:Abyssal_Resist_Consumable_I",
    "melvorItA:Deep_Wounds_Consumable_I",
    "melvorItA:Withering_Consumable_I",
    "melvorItA:Silence_Consumable_I",
    "melvorItA:Soul_Harvesting_Consumable_I",
    "melvorItA:Item_Cost_Consumable_I",
    "melvorItA:Eldritch_Curse_Consumable_I",
    "melvorItA:Voidburst_Consumable_I",
    "melvorItA:Harvesting_Consumable_II",
    "melvorItA:Corrupted_Light_Consumable_II",
    "melvorItA:Dark_Summon_Consumable_II",
    "melvorItA:Toxicity_Consumable_II",
    "melvorItA:Abyssal_Essence_Consumable_II",
    "melvorItA:Shade_Consumable_II",
    "melvorItA:Fear_Consumable_II",
    "melvorItA:Abyssal_Resist_Consumable_II",
    "melvorItA:Deep_Wounds_Consumable_II",
    "melvorItA:Withering_Consumable_II",
    "melvorItA:Silence_Consumable_II",
    "melvorItA:Soul_Harvesting_Consumable_II",
    "melvorItA:Item_Cost_Consumable_II",
    "melvorItA:Eldritch_Curse_Consumable_II",
    "melvorItA:Voidburst_Consumable_II",
  ];

  items.forEach((item) => addTestItem(item));
}

function upgradePotion(itemId, allPotionUpgrades, sellRemainderPotions) {
  const tierUpgrades = getUpgrades(itemId, allPotionUpgrades);
  tierUpgrades.forEach((upgrade) => {
    if (upgrade === null) return;
    if (!game.bank.checkUpgradePotionRequirement(upgrade) || game.bank.getMaxUpgradeQuantity(upgrade) === 0) return;
    game.bank.upgradeItemOnClick(upgrade, Infinity);
    // Ensure potions were upgraded
    if (game.bank.getMaxUpgradeQuantity(upgrade) === 0 && sellRemainderPotions) {
      const usedPotion = upgrade.rootItems.find((item) => item.tier === upgrade.upgradedItem.tier - 1);
      const qty = game.bank.getQty(usedPotion);
      if (qty > 0) game.bank.processItemSale(usedPotion, qty);
    }
  });
}

function getUpgrades(itemId, allPotionUpgrades) {
  if (!itemId) return;
  const item = game.items.getObjectByID(itemId);
  if (!item || item.type !== 'Potion') return;

  const upgrades = [null, null, null];

  if (item.tier < 3) {
    upgrades[item.tier] = getNextUpgrade(item);
    let tier = item.tier + 1;
    while (tier < 3) {
      if (!upgrades[tier - 1]) break;
      upgrades[tier] = getNextUpgrade(upgrades[tier - 1].upgradedItem);
      tier++;
    }
  }

  if (item.tier > 0) {
    let tier = item.tier - 1;
    upgrades[tier] = getPrevUpgrade(item, allPotionUpgrades);
    tier--;
    while (tier > -1) {
      if (!upgrades[tier + 1]) break;
      const rootItem = upgrades[tier + 1].rootItems.find((i) => i.type === 'Potion' && i.tier === tier + 1);
      upgrades[tier] = getPrevUpgrade(rootItem, allPotionUpgrades);
      tier--;
    }
  }
  
  return upgrades;
}

function getNextUpgrade(item) {
  const upgrades = game.bank.itemUpgrades.get(item);
  if (!upgrades) return null;
  return upgrades.find((upgrade) => upgrade.upgradedItem.type === 'Potion' && upgrade.upgradedItem.tier === item.tier + 1);
}

function getPrevUpgrade(item, allPotionUpgrades) {
  const upgrade = allPotionUpgrades.map(([_, upgrades]) => upgrades.find((upgrade) => upgrade.upgradedItem.id === item.id && upgrade.rootItems.some((i) => i.type === 'Potion' && i.tier === item.tier - 1)))
    .find((upgrade) => upgrade !== undefined);
  return upgrade !== undefined ? upgrade : null;
}
