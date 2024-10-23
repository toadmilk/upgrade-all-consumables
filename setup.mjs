export function setup({ settings, onInterfaceReady }) {

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
      type: "dropdown",
      name: "prioritize-candleabra-or-candle-lamp",
      label: "Candelabra/Candle Lamp",
      hint: "Consumable to prioritize upgrading.",
      default: "melvorAoD:Candelabra_Lit",
      options: [
          { value: "melvorAoD:Candelabra_Lit", display: "Candelabra" },
          { value: "melvorAoD:Candle_Lamp_Lit", display: "Candle Lamp" },
      ],
      onChange(value) {
        events.emit('changeCandleabraOrCandleLamp', value);
      },
    },
    {
      type: 'switch',
      label: 'Sell remaining lower tier consumables',
      hint: 'For example, if you have 29 Tier I consumables and upgrade 15 of them to Tier II, enabling this will sell off the 14 spare consumables left. Any locked items will not be sold, recommended that hard to get ones such as Candleabra are locked.',
      name: 'sell-remainder-consumables',
      default: false,
      onChange(value) {
        events.emit('changeSellRemainderConsumables', value);
      },
    },
    {
      type: "switch",
      name: "upgrade-abyssal-contracts",
      default: false,
      label: "Upgrade Abyssal Contracts",
      hint: "Upgrade Abyssal Contracts to the next tier. This is off by default as it consumes a LOT of abyssal slayer coins.",
      onChange(value) {
        events.emit('changeUpgradeAbyssalContracts', value);
      },
    },
  ]);

  onInterfaceReady(() => {
    const store = ui.createStore({
      sellRemainderConsumables: settings.section('General').get('sell-remainder-consumables'),
      setsellRemainderConsumables(value) {
        this.sellRemainderConsumables = value;
      },
      candleabraOrCandleLamp: settings.section('General').get('prioritize-candleabra-or-candle-lamp'),
      setcandleabraOrCandleLamp(value) {
        this.candleabraOrCandleLamp = value;
      },
      upgradeAbyssalContracts: settings.section('General').get('upgrade-abyssal-contracts'),
      setupgradeAbyssalContracts(value) {
        this.upgradeAbyssalContracts = value;
      },
      upgradeAllConsumables() {
        upgradeAllConsumables(allConsumableUpgrades, this);
      }
    });

    events.on('changeSellRemainderConsumables', (v) => store.setsellRemainderConsumables(v));
    events.on('changeCandleabraOrCandleLamp', (v) => store.setcandleabraOrCandleLamp(v));
    events.on('changeUpgradeAbyssalContracts', (v) => store.setupgradeAbyssalContracts(v));

    // Consumables
    const consumableContainer = document.createElement('div');
    document.querySelector('lang-string[lang-id="BANK_STRING_4"]').parentElement
      .after(consumableContainer);
      
    ui.create({
      $template: '#bc-uap-root-2',
      store,
    }, consumableContainer);
  });
}

function upgradeAllConsumables(categorizedConsumableUpgrades, settings) {

  // TESTING
  // addTestItems();

  categorizedConsumableUpgrades.forEach((consumableUpgrades) => {
    let canUpgrade = true;

    // Continue upgrading until no more upgrades are available
    while (canUpgrade) {
      canUpgrade = false;

      const upgrades = consumableUpgrades
        .map(([_, upgrades]) => upgrades.find((upgrade) => game.bank.getMaxUpgradeQuantity(upgrade) > 0))
        .filter((upgrade) => upgrade !== undefined);

      upgrades.forEach((upgrade) => {
        const availableMaterial = game.bank.getMaxUpgradeQuantity(upgrade);
        
        // Skip if a previous consumable expended required materials
        if (availableMaterial <= 0) {
          console.log(`Skipping ${upgrade.upgradedItem} due to insufficient materials.`);
          return;
        }

        // Abyssal Contract and Candleabra/Candle Lamp prioritization
        const abyssalContracts = [
          "melvorItA:Abyssal_Negation_Contract_II",
          "melvorItA:Abyssal_Coin_Contract_II",
          "melvorItA:Abyssal_Counter_Contract_II",
          "melvorItA:Abyssal_Corruption_Contract_II",
        ];

        const upgradeId = upgrade.upgradedItem.id;

        if (!settings.upgradeAbyssalContracts && abyssalContracts.includes(upgradeId)) {
          return;
        }

        switch (settings.candleabraOrCandleLamp) {
          case "melvorAoD:Candelabra_Lit":
            if (upgradeId === "melvorAoD:Candle_Lamp_Lit") {
              return;
            }
            break;
          case "melvorAoD:Candle_Lamp_Lit":
            if (upgradeId === "melvorAoD:Candelabra_Lit") {
              return;
            }
            break;
        }

        // Perform the upgrade
        game.bank.upgradeItemOnClick(upgrade, Infinity);

        // If upgraded successfully, flag canUpgrade to true to allow for the next tier check
        if (game.bank.getMaxUpgradeQuantity(upgrade) === 0) {
          canUpgrade = true;

          // Sell off remaining consumables if allowed
          if (settings.sellRemainderConsumables) {
            const usedConsumable = upgrade.rootItems[0];
            const qty = game.bank.getQty(usedConsumable);
            const isLocked = game.bank.lockedItems.has(usedConsumable);
            if (qty > 0 && !isLocked) {
              game.bank.processItemSale(usedConsumable, qty);
            }
          }
        }
      });
    }
  });
}

function addTestItems() {
  function addTestItem(itemId) {
    game.bank.addItemByID(itemId, 16, true, true, false);
  }

  const items = [
    // "melvorF:Thiefs_Moneysack",
    // "melvorF:Wizards_Scroll",
    // "melvorF:Seed_Pouch",
    // "melvorF:Alchemists_Bag",
    // "melvorF:Burning_Scroll_Of_Gold",
    // "melvorF:Burning_Scroll_Of_Stardust",
    // "melvorF:Burning_Scroll_Of_Ash",
    // "melvorF:Quick_Burner",
    // "melvorF:Golden_Star",
    // "melvorTotH:Explorers_Map",
    // "melvorTotH:Portable_Rations",
    // "melvorTotH:Blood_Vial",
    // "melvorD:Mysterious_Stone",
    // "melvorTotH:Kindling_Pouch",
    // "melvorTotH:Artisan_Pouch",
    // "melvorAoD:Whetstone_Fragment",
    // "melvorAoD:Charged_Golden_Quiver",
    // "melvorAoD:Charged_Ancient_Quiver",
    "melvorAoD:Candle_Lamp",
    "melvorAoD:Candles",
    "melvorAoD:Candelabra",
    "melvorItA:Abyssal_Negation_Contract_I",
    "melvorItA:Abyssal_Coin_Contract_I",
    "melvorItA:Abyssal_Counter_Contract_I",
    "melvorItA:Abyssal_Corruption_Contract_I",
    // "melvorItA:Harvesting_Consumable_I",
    // "melvorItA:Corrupted_Light_Consumable_I",
    // "melvorItA:Dark_Summon_Consumable_I",
    // "melvorItA:Toxicity_Consumable_I",
    // "melvorItA:Abyssal_Essence_Consumable_I",
    // "melvorItA:Shade_Consumable_I",
    // "melvorItA:Fear_Consumable_I",
    // "melvorItA:Abyssal_Resist_Consumable_I",
    // "melvorItA:Deep_Wounds_Consumable_I",
    // "melvorItA:Withering_Consumable_I",
    // "melvorItA:Silence_Consumable_I",
    // "melvorItA:Soul_Harvesting_Consumable_I",
    // "melvorItA:Item_Cost_Consumable_I",
    // "melvorItA:Eldritch_Curse_Consumable_I",
    // "melvorItA:Voidburst_Consumable_I",
    // "melvorItA:Harvesting_Consumable_II",
    // "melvorItA:Corrupted_Light_Consumable_II",
    // "melvorItA:Dark_Summon_Consumable_II",
    // "melvorItA:Toxicity_Consumable_II",
    // "melvorItA:Abyssal_Essence_Consumable_II",
    // "melvorItA:Shade_Consumable_II",
    // "melvorItA:Fear_Consumable_II",
    // "melvorItA:Abyssal_Resist_Consumable_II",
    // "melvorItA:Deep_Wounds_Consumable_II",
    // "melvorItA:Withering_Consumable_II",
    // "melvorItA:Silence_Consumable_II",
    // "melvorItA:Soul_Harvesting_Consumable_II",
    // "melvorItA:Item_Cost_Consumable_II",
    // "melvorItA:Eldritch_Curse_Consumable_II",
    // "melvorItA:Voidburst_Consumable_II",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
    // "melvorItA:Echocite_Fragment",
  ];

  items.forEach((item) => addTestItem(item));
}
