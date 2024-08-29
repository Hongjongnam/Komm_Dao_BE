const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "PROJECT_INFO",
    {
      pjt_id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "USER_RATING",
          key: "pjt_id",
        },
      },
      pjt_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      x_link: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      x_followers: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      discord_link: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      discord_members: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      linkedIn_link: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      github_link: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      github_stars: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      github_wkly_comm: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      raising_amount: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      valuation: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      investors: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      pjt_grade: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "0",
      },
      pjt_summary: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      pjt_details: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      adm_trend: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      adm_expertise: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      adm_final_grade: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      update_date: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      update_yn: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      apply_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      apply_yn: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      total_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      total_per: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      create_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "PROJECT_INFO",
      timestamps: false,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "pjt_id" }],
        },
      ],
    }
  );
};
