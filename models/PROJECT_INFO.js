const { Sequelize, DataTypes } = require("sequelize");

// 수정사항 : 테이블 동기화 후 AUTO_INCREMENT를 1로 리셋하는 후크 추가
module.exports = function (sequelize, DataTypes) {
  const ProjectInfo = sequelize.define(
    "PROJECT_INFO",
    {
      create_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW, // 현재 날짜를 기본값으로 설정
      },
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
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      x_followers: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0, // 기본값을 0으로 설정
      },
      discord_link: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      discord_members: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0, // 기본값을 0으로 설정
      },
      linkedIn_link: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      github_link: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      github_stars: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0, // 기본값을 0으로 설정
      },
      github_wkly_comm: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      raising_amount: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      valuation: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      investors: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      pjt_grade: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "0",
      },
      pjt_summary: {
        type: DataTypes.STRING(500),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      pjt_details: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      adm_trend: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      adm_expertise: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      adm_final_grade: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "", // 기본값을 빈 문자열로 설정
      },
      update_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      update_yn: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "N", // 기본값을 "N"으로 설정
      },
      apply_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW, // 현재 날짜를 기본값으로 설정
      },
      apply_yn: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "N", // 기본값을 "N"으로 설정
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

  // 테이블 동기화 후 AUTO_INCREMENT를 1로 리셋하는 후크 추가
  ProjectInfo.afterSync(async () => {
    await sequelize.query("ALTER TABLE PROJECT_INFO AUTO_INCREMENT = 1");
  });

  return ProjectInfo;
};
