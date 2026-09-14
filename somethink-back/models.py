from sqlalchemy import Column, Integer
from database import Base


class Test(Base):
    __tablename__ = "test"

    id = Column(Integer, primary_key=True, index=True)
    test_column = Column(Integer)