/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  SWETHA

; Last Change Date :  30/08/2024 10.05 AM 

; =============================================  */  



CREATE PROCEDURE Sp_ProductionEntryQty_Panel_1 (@Id Int,@SizId Int,@Qty Int,@compId int,@oldPcs INT)  As  

Begin   

DECLARE @Ordid int ,@Styleno Varchar(30),@PartID int,@ColId int , @LotID int,@LotNo varchar(100),@coycode int,@godid int,@Cnt int,@StageId int



SELECT @Ordid = Ordid FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @Styleno = StyleNo FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @PartID = Partid FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @ColId = Clrid FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @LotNo = LotNo FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @Coycode = Coyid from Trs_AddPanelEntry WHERE ID = @ID 

SELECT @godid = Godid from Trs_AddPanelEntry WHERE ID = @ID 

SELECT @LotId = LotID FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @StageId = StageID FROM Trs_AddPanelEntry WHERE ID = @ID 



SELECT @Cnt = 0



SELECT @Cnt = COUNT(1) FROM Panel_StockTable A INNER JOIN Panel_stockTableQty B ON A.PcsStockID = B.PcsSTockID WHERE

A.Ordid = @Ordid And A.Styleno = @Styleno and a.StageID  = @StageID And A.PartId = @PartID And A.Coycode = @coycode And A.LotID = @LotID

And A.GodId = @godid And b.ColID = @ColId AND  B.SizeId = @SizId And B.CompID = @compId 





If (Select Count(Id) From Trs_AddPanelEntryQty Where  ID = @ID And SizID = @SizID)=0 And @Qty>0  

BegiN    

print 'aaa'

Insert Into Trs_AddPanelEntryQty (Id,SizId,ProdPcs) Values (@Id,@SizId,@Qty)  

Exec PROC_Stock_ProdPanel @ID,@SizID,@Qty,@compId  

Update Trs_AddPanelEntry Set StockPostingFlg = 'Y' Where Id=@Id 

End   

ELSE   



BEGIN   

IF (Select Count(Id) From Trs_AddPanelEntryQty Where ID = @ID And SizID = @SizID)>0 And @Qty>0  and @Cnt =0

Begin   

print 'a21'

--Insert Into Trs_AddPanelEntryQty (Id,SizId,ProdPcs) Values (@Id,@SizId,@Qty)  

Exec PROC_Stock_ProdPanel @ID,@SizID,@Qty,@compId  

--Update Trs_AddPanelEntryQty Set SizId = @SizId ,ProdPcs = @Qty Where Id=@Id And SizId = @SizId   

End  

ELSE

BEGIN   



IF (Select Count(Id) From Trs_AddPanelEntryQty Where ID = @ID And SizID = @SizID)>0 And @Qty>0  

Begin   

print 'a2'

--Exec PROC_Stock_ProdPanel_1 @ID,@SizID,@Qty,@compId  

Exec PROC_Stock_ProdPanel_Update @ID,@SizID,@Qty,@CompID ,@oldPcs

Update Trs_AddPanelEntryQty Set SizId = @SizId ,ProdPcs = @Qty Where Id=@Id And SizId = @SizId   

End  



Else    

Begin  	 

print 'del'

Exec PROC_Stock_ProdPanel_Delete @Id,@SizId,0 

Delete From Trs_AddPanelEntryQty Where Id=@Id And SizId=@SizId    

Delete From Trs_AddPanelEntryQty_WithComponent Where Id=@Id And SizeId=@SizId    

EnD   

END  

EnD 



END

/*  

CREATE PROCEDURE Sp_ProductionEntryQty_Panel_1 (@Id Int,@SizId Int,@Qty Int,@compId int,@oldPcs INT)  As  

Begin   

DECLARE @Ordid int ,@Styleno Varchar(30),@PartID int,@ColId int , @LotID int,@LotNo varchar(100),@coycode int,@godid int,@Cnt int,@StageId int



SELECT @Ordid = Ordid FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @Styleno = StyleNo FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @PartID = Partid FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @ColId = Clrid FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @LotNo = LotNo FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @Coycode = Coyid from Trs_AddPanelEntry WHERE ID = @ID 

SELECT @godid = Godid from Trs_AddPanelEntry WHERE ID = @ID 

SELECT @LotId = LotID FROM Trs_AddPanelEntry WHERE ID = @ID 

SELECT @StageId = StageID FROM Trs_AddPanelEntry WHERE ID = @ID 



SELECT @Cnt = 0



SELECT @Cnt = COUNT(1) FROM Panel_StockTable A INNER JOIN Panel_stockTableQty B ON A.PcsStockID = B.PcsSTockID WHERE

A.Ordid = @Ordid And A.Styleno = @Styleno and a.StageID  = @StageID And A.PartId = @PartID And A.Coycode = @coycode And A.LotID = @LotID

And A.GodId = @godid And b.ColID = @ColId AND  B.SizeId = @SizId And B.CompID = @compId 





If (Select Count(Id) From Trs_AddPanelEntryQty Where  ID = @ID And SizID = @SizID)=0 And @Qty>0  

BegiN    

print 'aaa'

Insert Into Trs_AddPanelEntryQty (Id,SizId,ProdPcs) Values (@Id,@SizId,@Qty)  

Exec PROC_Stock_ProdPanel @ID,@SizID,@Qty,@compId  

Update Trs_AddPanelEntry Set StockPostingFlg = 'Y' Where Id=@Id 

End   

ELSE   



BEGIN   

IF (Select Count(Id) From Trs_AddPanelEntryQty Where ID = @ID And SizID = @SizID)>0 And @Qty>0  and @Cnt =0

Begin   

print 'a21'

--Insert Into Trs_AddPanelEntryQty (Id,SizId,ProdPcs) Values (@Id,@SizId,@Qty)  

Exec PROC_Stock_ProdPanel @ID,@SizID,@Qty,@compId  

--Update Trs_AddPanelEntryQty Set SizId = @SizId ,ProdPcs = @Qty Where Id=@Id And SizId = @SizId   

End  

ELSE

BEGIN   



IF (Select Count(Id) From Trs_AddPanelEntryQty Where ID = @ID And SizID = @SizID)>0 And @Qty>0  

Begin   

print 'a2'

--Exec PROC_Stock_ProdPanel_1 @ID,@SizID,@Qty,@compId  

Exec PROC_Stock_ProdPanel_Update @ID,@SizID,@Qty,@CompID ,@oldPcs

Update Trs_AddPanelEntryQty Set SizId = @SizId ,ProdPcs = @Qty Where Id=@Id And SizId = @SizId   

End  



Else    

Begin  	 

Exec PROC_Stock_ProdPanel_Delete @Id,@SizId,0,@compId 

Delete From Trs_AddPanelEntryQty Where Id=@Id And SizId=@SizId    

EnD   

END  

EnD 



END */


