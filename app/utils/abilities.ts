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
        name: 'Vitesse de Deplacement',
        description: 'Augmente la vitesse de deplacement du personnage',
        baseValue: 200,
        stages: [250, 300, 350], // 3 upgrade stages
        currentStage: 0,
        cost: [10, 25, 50] // Cost in snowflakes for each stage
      },
      {
        id: 'bonus_size',
        name: 'Taille des bonus',
        description: 'Rend les bonus plus grands et plus faciles a attraper',
        // Represent upgrade as progress 0..1, mapped per item type
        baseValue: 0.0,
        stages: [0.33, 0.66, 1.0], // 3 stages: one third, two thirds, full size
        currentStage: 0,
        cost: [15, 35, 70]
      },
      {
        id: 'dash_cooldown',
        name: 'Temps de Recharge du Dash',
        description: 'Reduit le temps de recharge du dash',
        baseValue: 2000, // 2 seconds
        stages: [1500, 1000, 500], // 3 upgrade stages (1.5s, 1s, 0.5s)
        currentStage: 0,
        cost: [20, 45, 90]
      },
      {
        id: 'snowflake_value',
        name: 'Valeur des Flocons',
        description: 'Augmente les points par flocon',
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

  // --- Server sync helpers ---
  public setTotalSnowflakesFromServer(total: number) {
    if (Number.isFinite(total) && total >= 0) {
      this.gameStats.totalSnowflakes = Math.trunc(total);
      this.saveToStorage();
    }
  }

  public setAbilityStageFromServer(abilityId: string, stage: number) {
    const ability = this.getAbility(abilityId);
    if (!ability) return;
    const normalized = Math.max(0, Math.trunc(stage));
    ability.currentStage = normalized;
    this.saveToStorage();
  }

  public setAllStagesFromServer(stages: Record<string, number>) {
    Object.keys(stages || {}).forEach((id) => {
      this.setAbilityStageFromServer(id, stages[id]);
    });
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
          // Migration: rename 'gift_size' -> 'bonus_size' and map fields
          let migrated = false;
          this.abilities = this.abilities.map((ab: any) => {
            if (ab && ab.id === 'gift_size') {
              migrated = true;
              const currentStage = Math.max(0, Math.min(3, ab.currentStage || 0));
              return {
                id: 'bonus_size',
                name: 'Bonus Size',
                description: 'Increase gifts and vodka size',
                baseValue: 0.0,
                stages: [0.33, 0.66, 1.0],
                currentStage,
                cost: [15, 35, 70]
              } as any;
            }
            return ab;
          });
          if (migrated) {
            this.saveToStorage();
          }
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
