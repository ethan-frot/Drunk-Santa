export interface AbilityUpgrade {
  id: string;
  name: string;
  description: string;
  baseValue: number;
  stages: number[];
  currentStage: number;
  cost: number[];
}

export interface GameStats {
  totalSnowflakes: number;
  gamesPlayed: number;
  totalScore: number;
}

export class AbilityManager {
  private static instance: AbilityManager;
  private abilities: AbilityUpgrade[] = [];
  private gameStats: GameStats = {
    totalSnowflakes: 0,
    gamesPlayed: 0,
    totalScore: 0
  };

  private constructor() {
    this.initializeAbilities();
    this.loadFromStorage();
  }

  public static getInstance(): AbilityManager {
    if (!AbilityManager.instance) {
      AbilityManager.instance = new AbilityManager();
    }
    return AbilityManager.instance;
  }

  private initializeAbilities() {
    this.abilities = [
      {
        id: 'movement_speed',
        name: 'Movement Speed',
        description: 'Increase character movement speed',
        baseValue: 200,
        stages: [250, 300, 350], // 3 upgrade stages
        currentStage: 0,
        cost: [10, 25, 50] // Cost in snowflakes for each stage
      },
      {
        id: 'gift_size',
        name: 'Gift Size',
        description: 'Make gifts larger and easier to catch',
        baseValue: 0.15,
        stages: [0.20, 0.25, 0.30], // 3 upgrade stages
        currentStage: 0,
        cost: [15, 35, 70]
      },
      {
        id: 'dash_cooldown',
        name: 'Dash Cooldown',
        description: 'Reduce dash cooldown time',
        baseValue: 2000, // 2 seconds
        stages: [1500, 1000, 500], // 3 upgrade stages (1.5s, 1s, 0.5s)
        currentStage: 0,
        cost: [20, 45, 90]
      },
      {
        id: 'snowflake_value',
        name: 'Snowflake Value',
        description: 'Increase points per snowflake',
        baseValue: 1,
        stages: [2, 3, 5], // 3 upgrade stages
        currentStage: 0,
        cost: [25, 60, 120]
      }
    ];
  }

  public getAbilities(): AbilityUpgrade[] {
    return this.abilities;
  }

  public getAbility(id: string): AbilityUpgrade | undefined {
    return this.abilities.find(ability => ability.id === id);
  }

  public canUpgrade(abilityId: string): boolean {
    const ability = this.getAbility(abilityId);
    if (!ability) return false;
    
    // Check if already at max stage
    if (ability.currentStage >= ability.stages.length) return false;
    
    // Check if player has enough snowflakes
    const upgradeCost = ability.cost[ability.currentStage];
    return this.gameStats.totalSnowflakes >= upgradeCost;
  }

  public upgradeAbility(abilityId: string): boolean {
    const ability = this.getAbility(abilityId);
    if (!ability || !this.canUpgrade(abilityId)) return false;

    const upgradeCost = ability.cost[ability.currentStage];
    this.gameStats.totalSnowflakes -= upgradeCost;
    ability.currentStage++;
    
    this.saveToStorage();
    return true;
  }

  public getCurrentValue(abilityId: string): number {
    const ability = this.getAbility(abilityId);
    if (!ability) return 0;

    if (ability.currentStage === 0) {
      return ability.baseValue;
    }
    return ability.stages[ability.currentStage - 1];
  }

  public addSnowflakes(amount: number) {
    this.gameStats.totalSnowflakes += amount;
    this.saveToStorage();
  }

  public addGamePlayed(score: number) {
    this.gameStats.gamesPlayed++;
    this.gameStats.totalScore += score;
    this.saveToStorage();
  }

  public getGameStats(): GameStats {
    return { ...this.gameStats };
  }

  public getTotalSnowflakes(): number {
    return this.gameStats.totalSnowflakes;
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameAbilities', JSON.stringify(this.abilities));
      localStorage.setItem('gameStats', JSON.stringify(this.gameStats));
    }
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const savedAbilities = localStorage.getItem('gameAbilities');
      const savedStats = localStorage.getItem('gameStats');
      
      if (savedAbilities) {
        try {
          this.abilities = JSON.parse(savedAbilities);
        } catch (e) {
          console.warn('Failed to load abilities from storage');
        }
      }
      
      if (savedStats) {
        try {
          this.gameStats = JSON.parse(savedStats);
        } catch (e) {
          console.warn('Failed to load stats from storage');
        }
      }
    }
  }

  public resetProgress() {
    this.initializeAbilities();
    this.gameStats = {
      totalSnowflakes: 0,
      gamesPlayed: 0,
      totalScore: 0
    };
    this.saveToStorage();
  }
}
