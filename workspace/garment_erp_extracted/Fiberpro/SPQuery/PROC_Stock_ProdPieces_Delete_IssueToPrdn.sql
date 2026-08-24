/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  QUERY

; Change Person    :  ASLAM

; Last Change Date :  17/01/2025 10.40 AM 

; =============================================  */  

CREATE Procedure PROC_Stock_ProdPieces_Delete_IssueToPrdn (@Id int,@sizeId int,@ProdPcs Int) AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@SqlCond as Varchar(100),@LotID int  ,@PcsPerColor int,@LotNo Varchar(30)   ,@LotRequired char(1)  ,@EmpID int,@Empid1 Int,@PcsStk_From_IssueToProd as Char(1)

Select @Id=@Id     

Select  @Coycode = CoyId From Trs_ProdEntry Where Id=@Id      

Select @PartyId = 0      

Select @Empid1 = 0      

SELECT @Ordid = OrdId From Trs_ProdEntry Where Id=@Id      
SELECT @StyleNo = StyleNo From Trs_ProdEntry Where Id=@Id      
SELECT @LotID = IsNull(LotID,0) From Trs_ProdEntry Where Id=@Id      
SELECT @LotNo = LotName from Mas_Lot Where LotSNo = @LotID   
  


SELECT @Stageid = StageId From Trs_ProdEntry Where Id=@Id       

SELECT @PartId = PartId From Trs_ProdEntry Where Id=@Id     

SELECT @GodId = GodId From Trs_ProdEntry Where Id=@Id     

SELECT @Rework = Rework From Trs_ProdEntry Where Id=@Id      

SELECT @PcsStk_From_IssueToProd = IsNull(PcsStk_From_IssueToProd,'N') From Options1 

SELECT @RejectionTypeId = RejectionTypeId From Trs_ProdEntry Where Id=@Id      

Select @SeqNo = SeqNo From Trs_ProdEntry Inner Join Prod_Sequence On Trs_ProdEntry.OrdId=Prod_Sequence.OrdId And Trs_ProdEntry.StyleNo=Prod_Sequence.StyleNo And Trs_ProdEntry.StageId=Prod_Sequence.StageId Where Id=@Id     

SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_ProdEntry Inner Join Mas_JobWrkComp On Trs_ProdEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_ProdEntry.Id=@Id      

SELECT @ColId = ClrId From Trs_ProdEntry Where Id=@Id     

Select @SourceStageId=SourceStageId From Trs_ProdEntry Where Id=@Id      

SELECT @StockQty = @ProdPcs     

SELECT @LotRequired = isnull(Lotwisestock,'N') From Ordermas2 where Ordid = @Ordid 

if @PcsStk_From_IssueToProd ='Y'

BEGIN

	SELECT @EmpID = IsNull(EmpID,0) From Trs_Prodentry WHERe ID = @ID 

	SELECT @Empid1 = 0 

END

ElSE

BEGIN

	SELECT @EmpID = 0

	SELECT @Empid1 =0

END 



print 'aslam'

print @empid1

if @FinalStage='F'   

SELECT @PcsPerColor = isNull(Avg(PcsPerColor),1) FRom OrderQtyDtl Where Ordid = @Ordid And StyleNo=@StyleNo And LotNo = @Lotno and  ColID in (@ColId)   /*CmbClrID in (@ColId) */   


Else   

SELECT @PcsPerColor = isNull(Avg(PcsPerColor),1) FRom OrderQtyDtl Where Ordid = @Ordid And StyleNo=@StyleNo And LotNo = @Lotno and ColID in (@ColId) 

Begin    

DECLARE LINE_CURSOR   CURSOR FOR    Select Id,SizID,ProdPcs FROM Trs_ProdentryQty Where ID=@Id and SizId = @SizeID     

OPEN LINE_CURSOR     

FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs      


WHILE @@FETCH_STATUS = 0          

BEGIN      

 if @FinalStage='F'      

 Begin 

 print 'aaa'       

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@ProdPcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@ProdPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo  And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.StageId=

Trs_Prodentry.StageId /*And Pcs_StockTable.PartId=Trs_Prodentry.PartId */ And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0  WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.Stageid=Trs_Prodentry.Stageid   and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Trs_Prodentry.Id=@Id     And IsNull(Pcs_StockTable.EmpID,0) = 0

select * from Pcs_StockTableQty where PcsStockId in (5853,5854) and SizeId =2





End     



if @FinalStage='S'     



Begin        



UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@ProdPcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@ProdPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.StageId=Trs_Prodentry.StageId And Pcs_StockTable.PartId=Trs_Prodentry.PartId And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.Stageid=Trs_Prodentry.Stageid And Pcs_StockTable.PartId=Trs_Prodentry.PartId and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Trs_Prodentry.Id=@Id     And IsNull(Pcs_StockTable.EmpID,0) = @EmpID1





End     



If @SourceStageid<>0 And @StageId<>1 And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  

 Begin      

 

If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And IsNull(EmpID,0) = @EmpID)       



begin   

  Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID  and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId     And IsNull(EmpID,0) = @EmpID



 If EXISTS (select * from Pcs_StockTable   

Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId=@LotID and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and  PartyId=@PartyId And IsNull(Pcs_StockTable.EmpID,0) = @EmpID and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End)       



Begin      

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@ProdPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And


  Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.PartId=Trs_Prodentry.PartId And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and    IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)Then 'G' Else 'M' End    and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else 

  @RejectionTypeId End 	And Pcs_StockTableQty.SizeId=@SizeId /*	and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End 	and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Re
work,0)=2 )Then 0 Else @RejectionTypeId End */ 	WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.
PartId=Trs_Prodentry.PartId and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)
=2)Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End and Partyid=@Partyid And Pcs_StockTable.StageId=@SourceStageId And Trs_Prodentry.Id=@Id    And
 IsNull(Pcs_StockTable.EmpID,0) = @EmpID







End    



Else   

Begin    

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull
(@Rework,0)=2 ) Then 0 Else @RejectionTypeId End ) 





End     

End    

Else   

begin         



Select @PcsStockId =Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable 



INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID,EmpID) VALUES (@Coycode,@Ordid,@StyleNo,@SourceStageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID,@EmpID)    



INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull
(@Rework,0)=2 ) Then 0 Else @RejectionTypeId End)   



 End    

End    



If  @StageId<>1 And @FinalStage='F' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  

Begin    



If EXISTS (select * from Pcs_StockTable INNER JOIN Trs_ProdEntry_SourceStageDtl ON   Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and GodId=@GodId and PartyId=@PartyId and  IsNull(Pcs_StockTable.EmpID,0) = @EmpID)      



begin 



print 'bbb'  

Select @PcsStockId=PcsStockId From Pcs_StockTable INNER JOIN Trs_ProdEntry_SourceStageDtl ON   Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and  GodId=@GodId and PartyId=@PartyId and Trs_ProdEntry_SourceStageDtl.ID  = @ID   And IsNull(Pcs_StockTable.EmpID,0) = @EmpID



print @pcsstockid

print 'fjfjfjff'

If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId INNER JOIN Trs_ProdEntry_SourceStageDtl ON    Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID  and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.SizeId=@SizeId And IsNull(Pcs_StockTable.EmpID,0) = @EmpID and 
IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')= Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End
)   





Begin   
print 'assssssss'
  /* UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+(@ProdPcs*@PcsPerColor) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coy


code=Trs_Prodentry.CoyId And  Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.SizeId=@SizeId and IsNu


ll(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End INNE


R JOIN Trs_ProdEntry_SourceStageDtl ON







  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  and Trs_ProdEntry_SourceStageDtl.Id = @Id WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs


_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNul


l(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End and Partyid=@Partyid  And Trs_Prodentry.Id=@Id and Trs_Pro


dEntry_SourceStageDtl.Id = @Id */  





  if @LotRequired = 'Y'

  BEGIN
  /*
  print 'firstone'
  print @ProdPcs
  print @empid1 */
/* Test */

    /* UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+(@ProdPcs*isnull(PcsPerColor,1)) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And  Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End INNER JOIN Trs_ProdEntry_SourceStageDtl ON   Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId   inner join (Select Distinct Ordid,styleno,colid,lotno,Partid,SizeId,isnull(Avg(PcsPerColor),1) as PcsPerColor from OrderQtyDtl GROUP BY Ordid,styleno,colid,Partid,Lotno,SizeId) OrderQtyDtl ON  Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And Pcs_StockTableQty.ColId = OrderQtyDtl.ColId  And Trs_Prodentry.LotNo = OrderQtyDtl.LotNo       And Pcs_StockTableQty.SizeId = OrderQtyDtl.SizeId     and Trs_ProdEntry_SourceStageDtl.Id = @Id WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End and Partyid=@Partyid  And Trs_Prodentry.Id=@Id and Trs_ProdEntry_SourceStageDtl.Id = @Id   And IsNull(Pcs_StockTable.EmpID,0) = @EmpID */

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@ProdPcs /*(@ProdPcs*isnull(PcsPerColor,1))*/ From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And  Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End INNER JOIN Trs_ProdEntry_SourceStageDtl ON   Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId   inner join (Select Distinct Ordid,styleno,CmbClrId,lotno,Partid,SizeId  from OrderQtyDtl GROUP BY Ordid,styleno,CmbClrId,Partid,Lotno,SizeId) OrderQtyDtl ON  Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And Pcs_StockTableQty.ColId = OrderQtyDtl.CmbClrId  And Trs_Prodentry.LotNo = OrderQtyDtl.LotNo       And Pcs_StockTableQty.SizeId = OrderQtyDtl.SizeId     and Trs_ProdEntry_SourceStageDtl.Id = @Id WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End and Partyid=@Partyid  And Trs_Prodentry.Id=@Id and Trs_ProdEntry_SourceStageDtl.Id = @Id   And IsNull(Pcs_StockTable.EmpID,0) = @EmpID


 
END 


ELSE

BEGIN
print 'Secondone'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@ProdPcs /*(@ProdPcs*isnull(PcsPerColor,1))*/ From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And  Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End INNER JOIN Trs_ProdEntry_SourceStageDtl ON   Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId   inner join (Select Distinct Ordid,styleno,CmbClrId,Partid,SizeId  from OrderQtyDtl GROUP BY Ordid,styleno,CmbClrId,Partid,Lotno,SizeId) OrderQtyDtl ON  Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And Pcs_StockTableQty.ColId = OrderQtyDtl.CmbClrId   And Pcs_StockTableQty.SizeId = OrderQtyDtl.SizeId     and Trs_ProdEntry_SourceStageDtl.Id = @Id WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End and Partyid=@Partyid  And Trs_Prodentry.Id=@Id and Trs_ProdEntry_SourceStageDtl.Id = @Id   And IsNull(Pcs_StockTable.EmpID,0) = @EmpID
END
END    

ELSE    

Begin         

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 ) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End) 







End 







End  







Else  







begin  







Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable        


INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID,EmpID) VALUES (@Coycode,@Ordid,@StyleNo,@SourceStageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID,@EmpID) 


INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 ) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End)  

End    

End     

 FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs      

END      
CLOSE LINE_CURSOR        
DEALLOCATE LINE_CURSOR       
SET NOCOUNT OFF     
END