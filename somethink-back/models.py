from sqlalchemy import Column, Integer, String
from database import Base


class Member(Base):
    __tablename__ = "Members"

    id = Column(String(50), primary_key=True, index=True)
    password = Column(String(100), nullable=False)


class Test(Base):
    __tablename__ = "test"

    id = Column(Integer, primary_key=True, index=True)
    test_column = Column(Integer)
